import type { GameState } from '../../../domain/game/contracts'
import { contentCatalog } from '../../content/contentCatalog'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Canonical household storage ID pattern.
 */
export const HOUSEHOLD_STORAGE_CONTAINER_ID = 'household:house-blackthorn:storage'

/**
 * Deposit an item from player inventory into household storage.
 *
 * @param state - Current game state
 * @param itemInstanceId - The unique ID of the item instance to deposit
 * @returns Updated game state
 */
export function depositToHouseStorage(state: GameState, itemInstanceId: string): GameState {
  // Check if item exists in player inventory
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) =>
    c.slots.some((s) => s.itemInstanceId === itemInstanceId)
  )

  if (playerContainerIndex === -1) {
    return state
  }

  const playerContainer = state.inventoryState.player.bagContainers[playerContainerIndex]
  const slotIndex = playerContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const slot = playerContainer.slots[slotIndex]

  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from player inventory
  const updatedPlayerContainers = [...state.inventoryState.player.bagContainers]
  const updatedPlayerSlots = [...playerContainer.slots]

  if (slot.quantity <= 1) {
    updatedPlayerSlots.splice(slotIndex, 1)
  } else {
    updatedPlayerSlots[slotIndex] = { ...slot, quantity: slot.quantity - 1 }
  }

  updatedPlayerContainers[playerContainerIndex] = { ...playerContainer, slots: updatedPlayerSlots }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  // Add to household storage
  let storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]

  if (storageContainerIndex === -1) {
    // Create household storage container if it doesn't exist
    storageContainerIndex = updatedSharedContainers.length
    updatedSharedContainers.push({
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest',
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      name: 'House Storage',
      maxSlots: 50,
      slots: [],
      locked: false,
    })
  }

  const storageContainer = updatedSharedContainers[storageContainerIndex]
  const storageSlotIndex = storageContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const updatedStorageSlots = [...storageContainer.slots]

  if (storageSlotIndex !== -1) {
    updatedStorageSlots[storageSlotIndex] = { ...updatedStorageSlots[storageSlotIndex], quantity: updatedStorageSlots[storageSlotIndex].quantity + 1 }
  } else if (storageContainer.slots.length < storageContainer.maxSlots) {
    updatedStorageSlots.push({ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 })
  } else {
    // Storage full, return state unchanged
    return state
  }

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  // Update item registry location
  const updatedItemRegistry = {
    ...state.inventoryState.itemRegistry,
    [itemInstanceId]: {
      ...itemInstance,
      locationType: 'container' as const,
      locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
    },
  }

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Deposited ${itemName} into house storage.`,
  )
}

/**
 * Move an item out of an NPC's own personal inventory (npcInventories[npcId]) into shared
 * household storage.
 *
 * User-reported live bug (2026-07-09): unequipping an item from an NPC correctly returns it to
 * that NPC's OWN personal inventory (unequipItemFromNpcInternal, verified via Playwright: no data
 * loss, no duplication) -- but nothing in the UI has ever displayed npcInventories[npcId], so from
 * the player's perspective the item "just disappears" the moment it's unequipped. This function is
 * the other half of closing that loop: the NpcDetailPanel's new "Personal Effects" section lets the
 * player move an item sitting in an NPC's own bag into House Storage, where it becomes visible and
 * re-assignable to any other roster member, exactly like this session's own destiny-fbsy/destiny-o97l
 * equip fixes already handle for shop-purchased items.
 */
export function moveNpcInventoryItemToHouseStorage(state: GameState, npcId: string, itemInstanceId: string): GameState {
  const npcContainers = state.inventoryState.npcInventories[npcId] ?? []
  let sourceContainerIndex = -1
  let sourceSlotIndex = -1
  for (const [containerIndex, container] of npcContainers.entries()) {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex !== -1) {
      sourceContainerIndex = containerIndex
      sourceSlotIndex = slotIndex
      break
    }
  }
  if (sourceContainerIndex === -1) return state

  const sourceContainer = npcContainers[sourceContainerIndex]
  const slot = sourceContainer.slots[sourceSlotIndex]

  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) return state

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId
  const npcName = state.npcRuntimeStates.find((n) => n.npcId === npcId)?.name ?? npcId

  // Remove from the NPC's own inventory
  const updatedSlots = [...sourceContainer.slots]
  if (slot.quantity <= 1) {
    updatedSlots.splice(sourceSlotIndex, 1)
  } else {
    updatedSlots[sourceSlotIndex] = { ...slot, quantity: slot.quantity - 1 }
  }
  const updatedNpcContainers = [...npcContainers]
  updatedNpcContainers[sourceContainerIndex] = { ...sourceContainer, slots: updatedSlots }

  // Add to household storage, creating the container if it doesn't exist yet (same lazy-creation
  // pattern as depositToHouseStorage above).
  let storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )
  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  if (storageContainerIndex === -1) {
    storageContainerIndex = updatedSharedContainers.length
    updatedSharedContainers.push({
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest',
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      name: 'House Storage',
      maxSlots: 50,
      slots: [],
      locked: false,
    })
  }
  const storageContainer = updatedSharedContainers[storageContainerIndex]
  const storageSlotIndex = storageContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const updatedStorageSlots = [...storageContainer.slots]
  if (storageSlotIndex !== -1) {
    updatedStorageSlots[storageSlotIndex] = { ...updatedStorageSlots[storageSlotIndex], quantity: updatedStorageSlots[storageSlotIndex].quantity + 1 }
  } else if (storageContainer.slots.length < storageContainer.maxSlots) {
    updatedStorageSlots.push({ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 })
  } else {
    // Storage full -- leave the NPC's own inventory untouched rather than losing the item.
    return state
  }
  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  const nextState: GameState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: updatedNpcContainers },
      sharedContainers: updatedSharedContainers,
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [itemInstanceId]: { ...itemInstance, locationType: 'container' as const, locationId: HOUSEHOLD_STORAGE_CONTAINER_ID },
      },
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Moved ${itemName} from ${npcName}'s personal effects into House Storage.`,
  )
}

/**
 * Withdraw an item from household storage into player inventory.
 *
 * @param state - Current game state
 * @param itemInstanceId - The unique ID of the item instance to withdraw
 * @returns Updated game state
 */
export function withdrawFromHouseStorage(state: GameState, itemInstanceId: string): GameState {
  // Check if item exists in household storage
  const storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (storageContainerIndex === -1) {
    return state
  }

  const storageContainer = state.inventoryState.sharedContainers[storageContainerIndex]
  const storageSlotIndex = storageContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

  if (storageSlotIndex === -1) {
    return state
  }

  const storageSlot = storageContainer.slots[storageSlotIndex]
  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from household storage
  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  const updatedStorageSlots = [...storageContainer.slots]

  if (storageSlot.quantity <= 1) {
    updatedStorageSlots.splice(storageSlotIndex, 1)
  } else {
    updatedStorageSlots[storageSlotIndex] = { ...storageSlot, quantity: storageSlot.quantity - 1 }
  }

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  // Add to player inventory
  let added = false
  const updatedPlayerContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (added) return container

    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (existingSlotIndex !== -1) {
      added = true
      const updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + 1,
      }
      return { ...container, slots: updatedSlots }
    }

    if (container.slots.length < container.maxSlots) {
      added = true
      return {
        ...container,
        slots: [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 }],
      }
    }

    return container
  })

  if (!added) {
    // Create new container if all existing ones are full
    updatedPlayerContainers.push({
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack',
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity: 1 }],
      locked: false,
    })
  }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  // Update item registry location
  const updatedItemRegistry = {
    ...state.inventoryState.itemRegistry,
    [itemInstanceId]: {
      ...itemInstance,
      locationType: 'player_inventory' as const,
      locationId: 'player',
    },
  }

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
      itemRegistry: updatedItemRegistry,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Withdrew ${itemName} from house storage.`,
  )
}

/**
 * Get all items currently in household storage.
 *
 * @param state - Current game state
 * @returns Array of item instances in household storage
 */
export function getHouseStorageItems(state: Pick<GameState, 'inventoryState'>): Array<{
  instanceId: string
  itemId: string
  quantity: number
  name: string
}> {
  // destiny (house-storage split, 2026-07-09): weapons/armor bought via equipmentPurchase.ts land
  // in the container keyed by HOUSEHOLD_STORAGE_CONTAINER_ID, while items routed through
  // moveItem's 'house_storage' location (the House Storage panel's pack/unpack actions) live in a
  // separate container with ownerId:'house_storage'. Players experience both as one "House
  // Storage" -- e.g. ItemSelectionModal (NPC equip picker) used to only read the former, so an
  // item visibly sitting in the House Storage panel (the latter) showed as "No weapons/armor in
  // House Storage" here. Aggregate both.
  const storageContainers = state.inventoryState.sharedContainers.filter(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID || c.ownerId === 'house_storage'
  )

  if (storageContainers.length === 0) {
    return []
  }

  const items: Array<{ instanceId: string; itemId: string; quantity: number; name: string }> = []

  for (const storageContainer of storageContainers) {
    for (const slot of storageContainer.slots) {
      if (slot.itemInstanceId) {
        const itemInstance = state.inventoryState.itemRegistry[slot.itemInstanceId]
        if (itemInstance) {
          const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
          items.push({
            instanceId: slot.itemInstanceId,
            itemId: itemInstance.itemId,
            quantity: slot.quantity,
            name: itemDef?.name ?? itemInstance.itemId,
          })
        }
      }
    }
  }

  return items
}

/**
 * Check if household storage has space for more items.
 *
 * @param state - Current game state
 * @returns true if storage has available slots
 */
export function hasHouseStorageSpace(state: GameState): boolean {
  const storageContainer = state.inventoryState.sharedContainers.find(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (!storageContainer) {
    return true // No container means unlimited (will be created on first use)
  }

  return storageContainer.slots.length < storageContainer.maxSlots
}

/**
 * Transfer an item from a site/room loot container to player inventory.
 * This represents picking up a found item.
 *
 * @param state - Current game state
 * @param siteContainerId - The container ID of the site/room loot container
 * @param itemInstanceId - The unique ID of the item instance to pick up
 * @returns Updated game state
 */
export function pickupFromSiteContainer(
  state: GameState,
  siteContainerId: string,
  itemInstanceId: string,
): GameState {
  // Check if item exists in site container
  const siteContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === siteContainerId
  )

  if (siteContainerIndex === -1) {
    return state
  }

  const siteContainer = state.inventoryState.sharedContainers[siteContainerIndex]
  const siteSlotIndex = siteContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

  if (siteSlotIndex === -1) {
    return state
  }

  const siteSlot = siteContainer.slots[siteSlotIndex]
  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from site container
  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  const updatedSiteSlots = [...siteContainer.slots]

  if (siteSlot.quantity <= 1) {
    updatedSiteSlots.splice(siteSlotIndex, 1)
  } else {
    updatedSiteSlots[siteSlotIndex] = { ...siteSlot, quantity: siteSlot.quantity - 1 }
  }

  updatedSharedContainers[siteContainerIndex] = { ...siteContainer, slots: updatedSiteSlots }

  // Add to player inventory
  let added = false
  const updatedPlayerContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (added) return container

    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (existingSlotIndex !== -1) {
      added = true
      const updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + 1,
      }
      return { ...container, slots: updatedSlots }
    }

    if (container.slots.length < container.maxSlots) {
      added = true
      return {
        ...container,
        slots: [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 }],
      }
    }

    return container
  })

  if (!added) {
    // Create new container if all existing ones are full
    updatedPlayerContainers.push({
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack',
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity: 1 }],
      locked: false,
    })
  }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Picked up ${itemName} from the site.`,
  )
}

/**
 * Store an item into a site/room loot container (e.g., hiding something).
 *
 * @param state - Current game state
 * @param siteContainerId - The container ID of the site/room loot container
 * @param itemInstanceId - The unique ID of the item instance to store
 * @returns Updated game state
 */
export function storeInSiteContainer(
  state: GameState,
  siteContainerId: string,
  itemInstanceId: string,
): GameState {
  // Check if item exists in player inventory
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) =>
    c.slots.some((s) => s.itemInstanceId === itemInstanceId)
  )

  if (playerContainerIndex === -1) {
    return state
  }

  const playerContainer = state.inventoryState.player.bagContainers[playerContainerIndex]
  const slotIndex = playerContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const slot = playerContainer.slots[slotIndex]

  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from player inventory
  const updatedPlayerContainers = [...state.inventoryState.player.bagContainers]
  const updatedPlayerSlots = [...playerContainer.slots]

  if (slot.quantity <= 1) {
    updatedPlayerSlots.splice(slotIndex, 1)
  } else {
    updatedPlayerSlots[slotIndex] = { ...slot, quantity: slot.quantity - 1 }
  }

  updatedPlayerContainers[playerContainerIndex] = { ...playerContainer, slots: updatedPlayerSlots }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  // Add to site container
  const siteContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === siteContainerId
  )

  // If site container doesn't exist, return state unchanged
  if (siteContainerIndex === -1) {
    return state
  }

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]

  const siteContainer = updatedSharedContainers[siteContainerIndex]
  const siteSlotIndex = siteContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const updatedSiteSlots = [...siteContainer.slots]

  if (siteSlotIndex !== -1) {
    updatedSiteSlots[siteSlotIndex] = { ...updatedSiteSlots[siteSlotIndex], quantity: updatedSiteSlots[siteSlotIndex].quantity + 1 }
  } else if (siteContainer.slots.length < siteContainer.maxSlots) {
    updatedSiteSlots.push({ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 })
  } else {
    // Site container full, return state unchanged
    return state
  }

  updatedSharedContainers[siteContainerIndex] = { ...siteContainer, slots: updatedSiteSlots }

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Stowed ${itemName} in the site.`,
  )
}

/**
 * Canonical organization storage ID pattern.
 * @param organizationId - The organization identifier (e.g., 'org-thieves-guild')
 */
export function getOrganizationStorageId(organizationId: string): string {
  return `${organizationId}:storage`
}

/**
 * Deposit an item from player inventory into organization storage.
 * Only works if the player has access to the organization (via NPC affiliation).
 *
 * @param state - Current game state
 * @param organizationId - The organization identifier
 * @param itemInstanceId - The unique ID of the item instance to deposit
 * @returns Updated game state
 */
export function depositToOrganizationStorage(
  state: GameState,
  organizationId: string,
  itemInstanceId: string,
): GameState {
  const organizationStorageId = getOrganizationStorageId(organizationId)

  // Check if item exists in player inventory
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) =>
    c.slots.some((s) => s.itemInstanceId === itemInstanceId)
  )

  if (playerContainerIndex === -1) {
    return state
  }

  const playerContainer = state.inventoryState.player.bagContainers[playerContainerIndex]
  const slotIndex = playerContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const slot = playerContainer.slots[slotIndex]

  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from player inventory
  const updatedPlayerContainers = [...state.inventoryState.player.bagContainers]
  const updatedPlayerSlots = [...playerContainer.slots]

  if (slot.quantity <= 1) {
    updatedPlayerSlots.splice(slotIndex, 1)
  } else {
    updatedPlayerSlots[slotIndex] = { ...slot, quantity: slot.quantity - 1 }
  }

  updatedPlayerContainers[playerContainerIndex] = { ...playerContainer, slots: updatedPlayerSlots }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  // Add to organization storage
  let storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === organizationStorageId
  )

  const updatedSharedContainers = [...state.inventoryState.sharedContainers]

  if (storageContainerIndex === -1) {
    // Create organization storage container if it doesn't exist
    storageContainerIndex = updatedSharedContainers.length
    updatedSharedContainers.push({
      containerId: organizationStorageId,
      containerType: 'vault',
      ownerId: organizationStorageId,
      name: `${organizationId} Storage`,
      maxSlots: 50,
      slots: [],
      locked: false,
    })
  }

  const storageContainer = updatedSharedContainers[storageContainerIndex]
  const storageSlotIndex = storageContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  const updatedStorageSlots = [...storageContainer.slots]

  if (storageSlotIndex !== -1) {
    updatedStorageSlots[storageSlotIndex] = { ...updatedStorageSlots[storageSlotIndex], quantity: updatedStorageSlots[storageSlotIndex].quantity + 1 }
  } else if (storageContainer.slots.length < storageContainer.maxSlots) {
    updatedStorageSlots.push({ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 })
  } else {
    // Storage full, return state unchanged
    return state
  }

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Deposited ${itemName} into ${organizationId} storage.`,
  )
}

/**
 * Withdraw an item from organization storage into player inventory.
 * Only works if the player has access to the organization (via NPC affiliation).
 *
 * @param state - Current game state
 * @param organizationId - The organization identifier
 * @param itemInstanceId - The unique ID of the item instance to withdraw
 * @returns Updated game state
 */
export function withdrawFromOrganizationStorage(
  state: GameState,
  organizationId: string,
  itemInstanceId: string,
): GameState {
  const organizationStorageId = getOrganizationStorageId(organizationId)

  // Check if item exists in organization storage
  const storageContainerIndex = state.inventoryState.sharedContainers.findIndex(
    (c) => c.containerId === organizationStorageId
  )

  if (storageContainerIndex === -1) {
    return state
  }

  const storageContainer = state.inventoryState.sharedContainers[storageContainerIndex]
  const storageSlotIndex = storageContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

  if (storageSlotIndex === -1) {
    return state
  }

  const storageSlot = storageContainer.slots[storageSlotIndex]
  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) {
    return state
  }

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  const itemName = itemDef?.name ?? itemInstance.itemId

  // Remove from organization storage
  const updatedSharedContainers = [...state.inventoryState.sharedContainers]
  const updatedStorageSlots = [...storageContainer.slots]

  if (storageSlot.quantity <= 1) {
    updatedStorageSlots.splice(storageSlotIndex, 1)
  } else {
    updatedStorageSlots[storageSlotIndex] = { ...storageSlot, quantity: storageSlot.quantity - 1 }
  }

  updatedSharedContainers[storageContainerIndex] = { ...storageContainer, slots: updatedStorageSlots }

  // Add to player inventory
  let added = false
  const updatedPlayerContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (added) return container

    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (existingSlotIndex !== -1) {
      added = true
      const updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + 1,
      }
      return { ...container, slots: updatedSlots }
    }

    if (container.slots.length < container.maxSlots) {
      added = true
      return {
        ...container,
        slots: [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity: 1 }],
      }
    }

    return container
  })

  if (!added) {
    // Create new container if all existing ones are full
    updatedPlayerContainers.push({
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack',
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity: 1 }],
      locked: false,
    })
  }

  const usedBagSlots = updatedPlayerContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  const nextState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: { ...state.inventoryState.player, bagContainers: updatedPlayerContainers, usedBagSlots },
      sharedContainers: updatedSharedContainers,
    },
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `Withdrew ${itemName} from ${organizationId} storage.`,
  )
}

/**
 * Get all items currently in organization storage.
 *
 * @param state - Current game state
 * @param organizationId - The organization identifier
 * @returns Array of item instances in organization storage
 */
export function getOrganizationStorageItems(
  state: GameState,
  organizationId: string,
): Array<{
  instanceId: string
  itemId: string
  quantity: number
  name: string
}> {
  const organizationStorageId = getOrganizationStorageId(organizationId)
  const storageContainer = state.inventoryState.sharedContainers.find(
    (c) => c.containerId === organizationStorageId
  )

  if (!storageContainer) {
    return []
  }

  const items: Array<{ instanceId: string; itemId: string; quantity: number; name: string }> = []

  for (const slot of storageContainer.slots) {
    if (slot.itemInstanceId) {
      const itemInstance = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (itemInstance) {
        const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
        items.push({
          instanceId: slot.itemInstanceId,
          itemId: itemInstance.itemId,
          quantity: slot.quantity,
          name: itemDef?.name ?? itemInstance.itemId,
        })
      }
    }
  }

  return items
}

/**
 * Check if an NPC has access to organization storage.
 * Note: Access control for organization storage is determined by faction standing
 * or explicit access flags, not by an organizationId field on the NPC.
 *
 * @param state - Current game state
 * @param npcId - The NPC identifier
 * @param organizationId - The organization identifier
 * @returns true if the NPC has access (placeholder for future implementation)
 */
export function hasOrganizationAccess(
  _state: GameState,
  _npcId: string,
  _organizationId: string,
): boolean {
  // TODO: Implement proper access control based on faction standing or access flags
  // For now, return false - organization storage access requires explicit permission
  return false
}