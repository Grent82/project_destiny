import { appendActivityLogEntry } from '../activityLog'
import { type GameState } from '../../../domain/game/contracts'
import { type TransferItemParams, type ItemLocationType, type ItemInstance } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Transfer an item instance between inventories or locations.
 *
 * Supports:
 * - Player <-> NPC inventory transfers
 * - Player <-> Container transfers (including household storage, shop stock)
 * - NPC <-> Container transfers
 * - Equipment <-> Inventory transfers
 * - Shop stock transfers (purchase/sell-back)
 *
 * @param state - Current game state
 * @param params.fromType - Source location type
 * @param params.fromId - Source location ID (containerId, npcId, 'player', or 'player')
 * @param params.toType - Destination location type
 * @param params.toId - Destination location ID
 * @param params.itemInstanceId - The unique ID of the item instance to transfer
 * @param params.quantity - Quantity to transfer (for stackable items)
 * @returns Updated game state (unchanged if transfer fails validation)
 */
export function transferItem(state: GameState, params: TransferItemParams): GameState {
  const { fromType, fromId, toType, toId, itemInstanceId, quantity } = params

  // Validate source exists and find the item
  const sourceResult = findItemInSource(state, fromType, fromId, itemInstanceId, quantity)
  if (!sourceResult) {
    return state
  }

  // Validate destination exists and has capacity
  const destCheck = validateDestination(state, toType, toId)
  if (!destCheck) {
    return state
  }

  // Get item definition for logging
  const itemDef = contentCatalog.itemsById.get(sourceResult.itemId)
  const itemName = itemDef?.name ?? sourceResult.itemId

  // Perform the transfer based on source type
  let newState: GameState = state

  if (sourceResult.sourceType === 'npc_inventory') {
    newState = removeFromNpcInventory(newState, fromId, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'player_inventory') {
    newState = removeFromPlayerInventory(newState, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'container') {
    newState = removeFromContainer(newState, fromId, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'shop_stock') {
    newState = removeFromShopStock(newState, fromId, itemInstanceId, quantity)
  } else if (sourceResult.sourceType === 'equipment') {
    newState = removeFromEquipment(newState, fromId, itemInstanceId, quantity)
  }

  // Add to destination
  if (toType === 'npc_inventory') {
    newState = addToNpcInventory(newState, toId, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'player_inventory') {
    newState = addToPlayerInventory(newState, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'container') {
    newState = addToContainer(newState, toId, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'shop_stock') {
    newState = addToShopStock(newState, toId, itemInstanceId, sourceResult.itemId, quantity)
  } else if (toType === 'equipment') {
    newState = addToEquipment(newState, toId, itemInstanceId, sourceResult.itemId)
  }

  // Update itemRegistry with new location
  newState = updateItemRegistryLocation(newState, itemInstanceId, toType, toId)

  // Log the transfer
  const fromLabel = formatLocationLabel(fromType, fromId)
  const toLabel = formatLocationLabel(toType, toId)
  newState = appendActivityLogEntry(newState, 'economy', `Transferred ${quantity}x ${itemName} from ${fromLabel} to ${toLabel}`)

  return newState
}

interface SourceResult {
  sourceType: 'npc_inventory' | 'player_inventory' | 'container' | 'shop_stock' | 'equipment'
  itemInstanceId: string
  itemId: string
  quantity: number
}

/**
 * Find an item instance in the source location.
 * Note: For the new container-based inventory, itemInstanceId IS the key we search by.
 * The itemId (template reference) would be stored separately in a real implementation.
 * For now, we treat itemInstanceId as both the instance ID and the item template ID.
 */
function findItemInSource(state: GameState, type: ItemLocationType, id: string, itemInstanceId: string, requiredQuantity: number): SourceResult | null {
  if (type === 'npc_inventory') {
    const npc = state.roster.find((n) => n.npcId === id)
    if (!npc) return null

    // Check NPC's containers (new format - inventoryState.npcInventories)
    const npcContainers = state.inventoryState.npcInventories[id]
    if (npcContainers) {
      for (const container of npcContainers) {
        const slot = container.slots.find((s) => s.itemInstanceId === itemInstanceId)
        if (slot && slot.quantity >= requiredQuantity) {
          return { sourceType: 'npc_inventory', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
        }
      }
    }

    return null
  }

  if (type === 'player_inventory') {
    // Check player's bag containers
    for (const container of state.inventoryState.player.bagContainers) {
      const slot = container.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'player_inventory', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    return null
  }

  if (type === 'container') {
    // Check player bags
    const playerContainer = state.inventoryState.player.bagContainers.find((c) => c.containerId === id)
    if (playerContainer) {
      const slot = playerContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    // Check shared containers (house storage, shop stock, etc.)
    const sharedContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === id)
    if (sharedContainer) {
      const slot = sharedContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }

    // Check NPC containers
    const npcContainers = state.inventoryState.npcInventories[id]
    if (npcContainers) {
      const npcContainer = npcContainers.find((c) => c.containerId === id)
      if (npcContainer) {
        const slot = npcContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
        if (slot && slot.quantity >= requiredQuantity) {
          return { sourceType: 'container', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
        }
      }
    }

    return null
  }

  if (type === 'shop_stock') {
    // Shop stock is stored as shared containers with ownerId starting with 'shop:'
    const shopContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === id || c.ownerId === id)
    if (shopContainer) {
      const slot = shopContainer.slots.find((s) => s.itemInstanceId === itemInstanceId)
      if (slot && slot.quantity >= requiredQuantity) {
        return { sourceType: 'shop_stock', itemInstanceId, itemId: itemInstanceId, quantity: slot.quantity }
      }
    }
    return null
  }

  if (type === 'equipment') {
    // Check player equipment
    if (id === 'player') {
      // Check all equipment slots for this item
      for (const equippedId of Object.values(state.inventoryState.player.equipmentSlots)) {
        if (equippedId === itemInstanceId) {
          return { sourceType: 'equipment', itemInstanceId, itemId: itemInstanceId, quantity: 1 }
        }
      }
      return null
    }

    // Check NPC equipment
    const npc = state.roster.find((n) => n.npcId === id)
    if (!npc) return null

    // Check NPC's equipment slots (loadout)
    if (npc.loadout.primaryWeaponId === itemInstanceId ||
        npc.loadout.secondaryWeaponId === itemInstanceId ||
        npc.loadout.armorId === itemInstanceId ||
        npc.loadout.accessoryIds?.includes(itemInstanceId)) {
      return { sourceType: 'equipment', itemInstanceId, itemId: itemInstanceId, quantity: 1 }
    }

    return null
  }

  return null
}

/**
 * Validate destination can receive items.
 */
function validateDestination(state: GameState, type: ItemLocationType, id: string): boolean {
  if (type === 'npc_inventory') {
    return state.roster.some((n) => n.npcId === id)
  }

  if (type === 'player_inventory') {
    const used = state.inventoryState.player.usedBagSlots
    const total = state.inventoryState.player.totalBagSlots
    return used < total
  }

  if (type === 'container') {
    const container = findContainer(state, id)
    return container !== null
  }

  if (type === 'shop_stock') {
    // Shop stock container must exist (shared container with shop: prefix)
    const shopContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === id || c.ownerId === id)
    return shopContainer !== null
  }

  if (type === 'equipment') {
    // Equipment slot must be valid and not already occupied by a different item
    if (id === 'player') {
      // Player equipment slots are always valid (can unequip to empty slot)
      return true
    }
    // Check if NPC exists
    return state.roster.some((n) => n.npcId === id)
  }

  return false
}

/**
 * Find a container by ID.
 */
function findContainer(state: GameState, containerId: string): { containerType: 'player' | 'shared' | 'npc'; containerId: string; container: import('../../../domain/inventory/contracts').InventoryContainer } | null {
  const playerContainer = state.inventoryState.player.bagContainers.find((c) => c.containerId === containerId)
  if (playerContainer) return { containerType: 'player', containerId, container: playerContainer }

  const sharedContainer = state.inventoryState.sharedContainers.find((c) => c.containerId === containerId)
  if (sharedContainer) return { containerType: 'shared', containerId, container: sharedContainer }

  for (const npcId of Object.keys(state.inventoryState.npcInventories)) {
    const npcContainer = state.inventoryState.npcInventories[npcId].find((c) => c.containerId === containerId)
    if (npcContainer) return { containerType: 'npc', containerId, container: npcContainer }
  }

  return null
}

/**
 * Remove items from NPC inventory.
 */
function removeFromNpcInventory(state: GameState, npcId: string, itemInstanceId: string, quantity: number): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npcContainers = state.inventoryState.npcInventories[npcId] || []

  // Find the item in NPC's containers
  let foundContainerIndex = -1
  let foundSlotIndex = -1
  let foundQuantity = 0

  for (const [containerIndex, container] of npcContainers.entries()) {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex !== -1) {
      foundContainerIndex = containerIndex
      foundSlotIndex = slotIndex
      foundQuantity = container.slots[slotIndex].quantity
      break
    }
  }

  if (foundContainerIndex === -1) return state

  const updatedContainers = [...npcContainers]
  const container = updatedContainers[foundContainerIndex]
  const updatedSlots = [...container.slots]

  if (foundQuantity <= quantity) {
    updatedSlots.splice(foundSlotIndex, 1)
  } else {
    updatedSlots[foundSlotIndex] = {
      ...updatedSlots[foundSlotIndex],
      quantity: foundQuantity - quantity,
    }
  }

  updatedContainers[foundContainerIndex] = { ...container, slots: updatedSlots }

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: {
        ...state.inventoryState.npcInventories,
        [npcId]: updatedContainers,
      },
    },
  }
}

/**
 * Remove items from player inventory.
 */
function removeFromPlayerInventory(state: GameState, itemInstanceId: string, quantity: number): GameState {
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return container

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = {
        ...slot,
        quantity: slot.quantity - quantity,
      }
    }

    return { ...container, slots: updatedSlots }
  })

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Remove items from a container.
 */
function removeFromContainer(state: GameState, containerId: string, itemInstanceId: string, quantity: number): GameState {
  // Check player bags
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) => c.containerId === containerId)
  if (playerContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[playerContainerIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return state

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = { ...slot, quantity: slot.quantity - quantity }
    }

    const updatedContainers = [...state.inventoryState.player.bagContainers]
    updatedContainers[playerContainerIndex] = { ...container, slots: updatedSlots }

    const usedSlots = updatedContainers.reduce((sum, cont) => sum + cont.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        player: { ...state.inventoryState.player, bagContainers: updatedContainers, usedBagSlots: usedSlots },
      },
    }
  }

  // Check shared containers
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === containerId)
  if (sharedIndex !== -1) {
    const container = state.inventoryState.sharedContainers[sharedIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return state

    const slot = container.slots[slotIndex]
    const updatedSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      updatedSlots.splice(slotIndex, 1)
    } else {
      updatedSlots[slotIndex] = { ...slot, quantity: slot.quantity - quantity }
    }

    const updatedContainers = [...state.inventoryState.sharedContainers]
    updatedContainers[sharedIndex] = { ...container, slots: updatedSlots }

    return {
      ...state,
      inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
    }
  }

  return state
}

/**
 * Remove items from shop stock container.
 */
function removeFromShopStock(state: GameState, shopId: string, itemInstanceId: string, quantity: number): GameState {
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === shopId || c.ownerId === shopId)
  if (sharedIndex === -1) return state

  const container = state.inventoryState.sharedContainers[sharedIndex]
  const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
  if (slotIndex === -1) return state

  const slot = container.slots[slotIndex]
  const updatedSlots = [...container.slots]

  if (slot.quantity <= quantity) {
    updatedSlots.splice(slotIndex, 1)
  } else {
    updatedSlots[slotIndex] = { ...slot, quantity: slot.quantity - quantity }
  }

  const updatedContainers = [...state.inventoryState.sharedContainers]
  updatedContainers[sharedIndex] = { ...container, slots: updatedSlots }

  return {
    ...state,
    inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
  }
}

/**
 * Remove items from equipment slot.
 */
function removeFromEquipment(state: GameState, ownerId: string, itemInstanceId: string, quantity: number): GameState {
  void quantity
  if (ownerId === 'player') {
    // Find which slot has this item
    const equippedSlot = Object.entries(state.inventoryState.player.equipmentSlots).find(
      ([slotName, equippedId]) => {
        void slotName // slotName is used below
        return equippedId === itemInstanceId
      }
    )
    if (!equippedSlot) return state
    const [slotName] = equippedSlot
    const updatedEquipment = {
      ...state.inventoryState.player.equipmentSlots,
      [slotName]: null,
    }

    // Add item back to player inventory
    return addToPlayerInventory(
      { ...state, inventoryState: { ...state.inventoryState, player: { ...state.inventoryState.player, equipmentSlots: updatedEquipment } } },
      itemInstanceId,
      itemInstanceId,
      1
    )
  }

  // NPC equipment removal
  const npcIndex = state.roster.findIndex((n) => n.npcId === ownerId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]
  const updatedNpc = { ...npc, loadout: { ...npc.loadout } }

  // Remove from loadout
  if (updatedNpc.loadout.primaryWeaponId === itemInstanceId) {
    updatedNpc.loadout.primaryWeaponId = null
  } else if (updatedNpc.loadout.secondaryWeaponId === itemInstanceId) {
    updatedNpc.loadout.secondaryWeaponId = null
  } else if (updatedNpc.loadout.armorId === itemInstanceId) {
    updatedNpc.loadout.armorId = null
  } else if (updatedNpc.loadout.accessoryIds) {
    updatedNpc.loadout.accessoryIds = updatedNpc.loadout.accessoryIds.filter(id => id !== itemInstanceId)
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = updatedNpc

  // Add item back to NPC inventory
  let result = { ...state, roster: updatedRoster }
  result = addToNpcInventory(result, ownerId, itemInstanceId, itemInstanceId, 1)

  return result
}

/**
 * Add items to shop stock container.
 */
function addToShopStock(state: GameState, shopId: string, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  void _itemId
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === shopId || c.ownerId === shopId)

  let updatedContainers: typeof state.inventoryState.sharedContainers

  if (sharedIndex === -1) {
    // Create new shop stock container
    updatedContainers = [
      ...state.inventoryState.sharedContainers,
      {
        containerId: shopId,
        containerType: 'vault',
        ownerId: shopId,
        name: `${shopId} Stock`,
        maxSlots: 50,
        slots: [{ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }],
        locked: false,
      },
    ]
  } else {
    const container = state.inventoryState.sharedContainers[sharedIndex]
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    const updatedSlots = [...container.slots]

    if (existingSlotIndex !== -1) {
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
    } else if (container.slots.length < container.maxSlots) {
      updatedSlots.push({ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity })
    } else {
      // Container full, create new one
      updatedContainers = [
        ...state.inventoryState.sharedContainers.slice(0, sharedIndex),
        container,
        {
          containerId: `${shopId}-stock-2`,
          containerType: 'vault',
          ownerId: shopId,
          name: `${shopId} Stock (2)`,
          maxSlots: 50,
          slots: [{ slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }],
          locked: false,
        },
        ...state.inventoryState.sharedContainers.slice(sharedIndex + 1),
      ]
      return {
        ...state,
        inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
      }
    }

    updatedContainers = [
      ...state.inventoryState.sharedContainers.slice(0, sharedIndex),
      { ...container, slots: updatedSlots },
      ...state.inventoryState.sharedContainers.slice(sharedIndex + 1),
    ]
  }

  return {
    ...state,
    inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
  }
}

/**
 * Add items to equipment slot.
 */
function addToEquipment(state: GameState, ownerId: string, itemInstanceId: string, itemId: string): GameState {
  const itemDef = contentCatalog.itemsById.get(itemId)
  if (!itemDef) return state

  if (ownerId === 'player') {
    // Determine appropriate slot based on item category
    let targetSlot: 'weapon' | 'armor' | 'accessory_1' | 'accessory_2' = 'accessory_1'

    if (itemDef.category === 'weapon') {
      targetSlot = 'weapon'
    } else if (itemDef.category === 'armor') {
      targetSlot = 'armor'
    }

    // Check if slot is available
    if (state.inventoryState.player.equipmentSlots[targetSlot]) {
      // Slot occupied, cannot equip
      return state
    }

    const updatedEquipment = {
      ...state.inventoryState.player.equipmentSlots,
      [targetSlot]: itemInstanceId,
    }

    // Remove from inventory first
    let result = removeFromPlayerInventory(state, itemInstanceId, 1)
    result = {
      ...result,
      inventoryState: {
        ...result.inventoryState,
        player: {
          ...result.inventoryState.player,
          equipmentSlots: updatedEquipment,
        },
      },
    }

    return result
  }

  // NPC equipment
  const npcIndex = state.roster.findIndex((n) => n.npcId === ownerId)
  if (npcIndex === -1) return state

  const npc = state.roster[npcIndex]
  const updatedNpc = { ...npc, loadout: { ...npc.loadout } }

  // Determine slot based on item category
  if (itemDef.category === 'weapon' && !updatedNpc.loadout.primaryWeaponId) {
    updatedNpc.loadout.primaryWeaponId = itemInstanceId
  } else if (itemDef.category === 'weapon' && !updatedNpc.loadout.secondaryWeaponId) {
    updatedNpc.loadout.secondaryWeaponId = itemInstanceId
  } else if (itemDef.category === 'armor' && !updatedNpc.loadout.armorId) {
    updatedNpc.loadout.armorId = itemInstanceId
  } else if (!updatedNpc.loadout.accessoryIds || updatedNpc.loadout.accessoryIds.length < 2) {
    const accessories = updatedNpc.loadout.accessoryIds || []
    updatedNpc.loadout.accessoryIds = [...accessories, itemInstanceId]
  } else {
    // No slot available
    return state
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = updatedNpc

  // Remove from inventory first
  let result = removeFromNpcInventory(state, ownerId, itemInstanceId, 1)
  result = { ...result, roster: updatedRoster }

  return result
}

/**
 * Update itemRegistry with new location information.
 */
function updateItemRegistryLocation(state: GameState, itemInstanceId: string, locationType: ItemLocationType, locationId: string): GameState {
  const existing = state.inventoryState.itemRegistry[itemInstanceId]
  if (!existing) {
    // Item not in registry, create new entry
    const newItem: ItemInstance = {
      uniqueId: itemInstanceId,
      itemId: itemInstanceId,
      quantity: 1,
      locationType,
      locationId,
      acquiredDay: state.day,
      acquiredFrom: locationId,
      flags: [],
    }
    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        itemRegistry: {
          ...state.inventoryState.itemRegistry,
          [itemInstanceId]: newItem,
        },
      },
    }
  }

  // Update existing entry
  const updatedItem: ItemInstance = {
    ...existing,
    locationType,
    locationId,
  }

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [itemInstanceId]: updatedItem,
      },
    },
  }
}

/**
 * Add items to NPC inventory.
 */
function addToNpcInventory(state: GameState, npcId: string, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  // Get current NPC containers and create deep copies
  const sourceContainers = state.inventoryState.npcInventories[npcId] || []
  const updatedContainers = sourceContainers.map((c) => ({
    ...c,
    slots: [...c.slots],
  }))

  // Try to find existing slot for this item instance or space in containers
  let added = false
  for (const container of updatedContainers) {
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (existingSlotIndex !== -1) {
      container.slots[existingSlotIndex] = {
        ...container.slots[existingSlotIndex],
        quantity: container.slots[existingSlotIndex].quantity + quantity,
      }
      added = true
      break
    }

    // Check for space in this container
    if (container.slots.length < container.maxSlots) {
      container.slots.push({
        slotId: `slot-${itemInstanceId}-${Date.now()}`,
        itemInstanceId,
        quantity,
      })
      added = true
      break
    }
  }

  // No space in existing containers, create new one
  if (!added) {
    updatedContainers.push({
      containerId: `npc-container-${Date.now()}`,
      containerType: 'backpack',
      ownerId: npcId,
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity }],
      locked: false,
    })
  }

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: {
        ...state.inventoryState.npcInventories,
        [npcId]: updatedContainers,
      },
    },
  }
}

/**
 * Add items to player inventory.
 */
function addToPlayerInventory(state: GameState, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  // Find first container with space
  let added = false
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (added) return container

    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (existingSlotIndex !== -1) {
      added = true
      const updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
      return { ...container, slots: updatedSlots }
    }

    // Check for empty slot
    if (container.slots.length < container.maxSlots) {
      added = true
      return {
        ...container,
        slots: [
          ...container.slots,
          { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity },
        ],
      }
    }

    return container
  })

  // If no space in existing containers, create new one
  if (!added) {
    const newContainer = {
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack' as const,
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity }],
      locked: false,
    }
    updatedContainers.push(newContainer)
  }

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Add items to a container.
 */
function addToContainer(state: GameState, containerId: string, itemInstanceId: string, _itemId: string, quantity: number): GameState {
  // Check player bags
  const playerContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) => c.containerId === containerId)
  if (playerContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[playerContainerIndex]
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    let updatedSlots: import('../../../domain/inventory/contracts').InventorySlot[]
    if (existingSlotIndex !== -1) {
      updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
    } else if (container.slots.length < container.maxSlots) {
      updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
    } else {
      return state // No space
    }

    const updatedContainers = [...state.inventoryState.player.bagContainers]
    updatedContainers[playerContainerIndex] = { ...container, slots: updatedSlots }

    const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

    return {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        player: { ...state.inventoryState.player, bagContainers: updatedContainers, usedBagSlots: usedSlots },
      },
    }
  }

  // Check shared containers
  const sharedIndex = state.inventoryState.sharedContainers.findIndex((c) => c.containerId === containerId)
  if (sharedIndex !== -1) {
    const container = state.inventoryState.sharedContainers[sharedIndex]
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    let updatedSlots: import('../../../domain/inventory/contracts').InventorySlot[]
    if (existingSlotIndex !== -1) {
      updatedSlots = [...container.slots]
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        quantity: updatedSlots[existingSlotIndex].quantity + quantity,
      }
    } else if (container.slots.length < container.maxSlots) {
      updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
    } else {
      return state // No space
    }

    const updatedContainers = [...state.inventoryState.sharedContainers]
    updatedContainers[sharedIndex] = { ...container, slots: updatedSlots }

    return {
      ...state,
      inventoryState: { ...state.inventoryState, sharedContainers: updatedContainers },
    }
  }

  return state
}

function formatLocationLabel(type: string, id: string): string {
  if (type === 'player_inventory') return 'your inventory'
  if (type === 'player_equipment') return 'your equipment'
  if (type === 'npc_inventory') return `${id}'s inventory`
  if (type === 'npc_equipment') return `${id}'s equipment`
  if (type === 'container') return `container ${id}`
  if (type === 'shop_stock') {
    // Extract shop name from ID (e.g., 'shop:harbor-smith:stock' -> 'Harbor Smith')
    const shopName = id.replace('shop:', '').replace(':stock', '').replace(/-/g, ' ')
    return `${shopName} stock`
  }
  if (type === 'equipment') return `${id}'s equipment`
  return id
}
