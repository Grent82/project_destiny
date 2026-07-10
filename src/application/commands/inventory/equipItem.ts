import { appendActivityLogEntry } from '../activityLog'
import { type GameState } from '../../../domain/game/contracts'
import { type NpcRuntimeState } from '../../../domain/npc/contracts'
import { type EquipItemParams, type EquipmentSlotType, type TransferItemParams } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'
import { transferItem } from './transferItem'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from './householdStorage'

/**
 * Equip an item instance on player or NPC.
 *
 * @param state - Current game state
 * @param params.ownerId - 'player' or npcId
 * @param params.itemInstanceId - The unique ID of the item instance to equip
 * @param params.slot - Equipment slot to use
 * @returns Updated game state
 */
export function equipItem(state: GameState, params: EquipItemParams): GameState {
  const { ownerId, itemInstanceId, slot } = params

  if (ownerId === 'player') {
    return equipItemToPlayer(state, itemInstanceId, slot)
  }

  return equipItemToNpc(state, ownerId, itemInstanceId, slot)
}

/**
 * Determine which containers an NPC can access for equipping.
 * Based on the canonical inventory decision:
 * - Roster NPC in player household: can equip from personal inventory AND household storage
 * - Organization NPC: can equip from personal inventory AND organization storage
 * - Unaffiliated NPC: can equip from personal inventory only
 */
function getAccessibleContainersForNpc(state: GameState, npcId: string): { containerType: 'npc_inventory' | 'container'; containerId: string }[] {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return []

  const containers: { containerType: 'npc_inventory' | 'container'; containerId: string }[] = []

  // Always allow personal inventory
  containers.push({ containerType: 'npc_inventory', containerId: npcId })

  // Check if NPC is in player household (roster and physically present at the house).
  // Valid household assignments: 'working', 'assigned_title', 'idle', 'training', 'defense',
  // and 'recovering' -- a recovering NPC is "resting in proper quarters" (see NpcDetailPanel's own
  // status text), i.e. still in the house. Excluding it from this list meant every roster NPC set
  // to Recovering could see items in House Storage but equip silently no-op'd on them with zero
  // feedback -- reported live as "House Storage has items but equipping still does nothing."
  // 'deployed' and 'transferred' correctly stay excluded: those NPCs are not physically at the house.
  const isHouseholdMember = npc.assignment === 'working' || npc.assignment === 'assigned_title' || npc.assignment === 'idle' || npc.assignment === 'training' || npc.assignment === 'defense' || npc.assignment === 'recovering'
  if (isHouseholdMember) {
    // destiny (house-storage split, 2026-07-09): weapons/armor bought via equipmentPurchase.ts
    // land in the HOUSEHOLD_STORAGE_CONTAINER_ID container, but items routed through moveItem's
    // 'house_storage' location (the House Storage panel's pack/unpack) live in a SEPARATE
    // container with ownerId:'house_storage'. This used to only expose the former as accessible,
    // so an item visibly offered by the equip picker (once the selector-side fix landed) still
    // silently failed to equip -- findNpcAccessibleItem could never locate it. Push an access
    // entry per real matching container (using its own containerId) so both are searchable.
    const householdContainers = state.inventoryState.sharedContainers.filter(
      (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID
        || c.ownerId === HOUSEHOLD_STORAGE_CONTAINER_ID
        || c.ownerId === 'house_storage'
    )
    for (const householdContainer of householdContainers) {
      containers.push({ containerType: 'container', containerId: householdContainer.containerId })
    }
  }

  // Organization-based access would require an affiliation field on the NPC
  // For now, we only support household storage access
  // TODO: Add affiliation tracking to NpcRuntimeState for organization-based access

  return containers
}

/**
 * Find an item instance in accessible containers for an NPC.
 */
function findNpcAccessibleItem(state: GameState, npcId: string, itemInstanceId: string): { containerType: string; containerId: string; slotIndex: number } | null {
  const accessible = getAccessibleContainersForNpc(state, npcId)

  for (const access of accessible) {
    if (access.containerType === 'npc_inventory') {
      const npcContainers = state.inventoryState.npcInventories[npcId] || []
      for (const container of npcContainers) {
        const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
        if (slotIndex !== -1) {
          return { containerType: 'npc_inventory', containerId: npcId, slotIndex }
        }
      }
    } else if (access.containerType === 'container') {
      const sharedContainer = state.inventoryState.sharedContainers.find(
        (c) => c.containerId === access.containerId || c.ownerId === access.containerId
      )
      if (sharedContainer) {
        const slotIndex = sharedContainer.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
        if (slotIndex !== -1) {
          return { containerType: 'shared_container', containerId: access.containerId, slotIndex }
        }
      }
    }
  }

  return null
}

/**
 * Equip an item to the player character.
 */
function equipItemToPlayer(state: GameState, itemInstanceId: string, slot: EquipmentSlotType): GameState {
  const currentEquipped = state.inventoryState.player.equipmentSlots[slot]

  // If something is already equipped, unequip it first
  let newState = state
  if (currentEquipped) {
    newState = unequipItemFromPlayer(newState, slot)
  }

  // Find the item in player inventory
  let itemFound = false
  const updatedContainers = state.inventoryState.player.bagContainers.map((container) => {
    if (itemFound) return container

    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)
    if (slotIndex === -1) return container

    itemFound = true
    const updatedSlots = [...container.slots]
    updatedSlots.splice(slotIndex, 1) // Remove from inventory when equipped

    return { ...container, slots: updatedSlots }
  })

  if (!itemFound) return state

  const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.reduce((s, slot) => s + slot.quantity, 0), 0)

  const updatedEquipment = {
    ...state.inventoryState.player.equipmentSlots,
    [slot]: itemInstanceId,
  }

  const itemName = getItemName(itemInstanceId)

  // Check for skillBonus/enableAction effects (for tool items)
  const itemDef = contentCatalog.itemsById.get(itemInstanceId)
  let finalState = newState
  if (itemDef && itemDef.category === 'tool') {
    for (const effect of itemDef.typedEffects) {
      if (effect.type === 'skillBonus') {
        finalState = {
          ...finalState,
          equippedTools: [
            ...finalState.equippedTools,
            {
              itemId: itemDef.id,
              skill: effect.skill,
              value: effect.value,
            },
          ],
        }
      } else if (effect.type === 'enableAction' && !finalState.enabledActions.includes(effect.action)) {
        finalState = {
          ...finalState,
          enabledActions: [...finalState.enabledActions, effect.action],
        }
      }
    }
  }

  finalState = appendActivityLogEntry(finalState, 'system', `Equipped ${itemName} in ${formatSlotName(slot)}`)

  return {
    ...finalState,
    inventoryState: {
      ...finalState.inventoryState,
      player: {
        ...finalState.inventoryState.player,
        equipmentSlots: updatedEquipment,
        bagContainers: updatedContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Unequip an item from the player character.
 */
function unequipItemFromPlayer(state: GameState, slot: EquipmentSlotType): GameState {
  const itemInstanceId = state.inventoryState.player.equipmentSlots[slot]
  if (!itemInstanceId) return state

  const itemName = getItemName(itemInstanceId)

  // Add back to inventory
  const updatedContainers = addSlotToPlayerContainers(state, itemInstanceId, 1)

  const updatedEquipment = {
    ...state.inventoryState.player.equipmentSlots,
    [slot]: null,
  }

  // Remove skillBonus effects if unequipping a tool
  let finalState = state
  if (itemInstanceId) {
    const currentItemDef = contentCatalog.itemsById.get(itemInstanceId)
    if (currentItemDef && currentItemDef.category === 'tool') {
      finalState = {
        ...state,
        equippedTools: state.equippedTools.filter(
          (t) => t.itemId !== currentItemDef.id,
        ),
      }
    }
  }

  finalState = appendActivityLogEntry(finalState, 'system', `Unequipped ${itemName} from ${formatSlotName(slot)}`)

  return {
    ...finalState,
    inventoryState: {
      ...finalState.inventoryState,
      player: {
        ...finalState.inventoryState.player,
        equipmentSlots: updatedEquipment,
        bagContainers: updatedContainers,
      },
    },
  }
}

/**
 * Equip an item to an NPC.
 * Supports equipping from personal inventory and accessible shared storage (household/organization).
 */
function equipItemToNpc(state: GameState, npcId: string, itemInstanceId: string, slot: EquipmentSlotType): GameState {
  const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.npcRuntimeStates[npcIndex]

  // Get item definition from the item registry (not the catalog, since we have an instance ID)
  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) return state

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  if (!itemDef) return state

  if (!isValidSlotForItem(itemDef, slot)) {
    return state
  }

  // Find the item in accessible containers
  const itemLocation = findNpcAccessibleItem(state, npcId, itemInstanceId)
  if (!itemLocation) {
    // Item not found in any accessible container
    return state
  }

  // Unequip current item in this slot if any
  const currentEquipped: string | null = slot === 'accessory_1'
    ? npc.equipment.accessory?.[0] ?? null
    : slot === 'accessory_2'
      ? npc.equipment.accessory?.[1] ?? null
      : (npc.equipment[slot as 'weapon' | 'armor'] as string) ?? null

  let nextState: GameState = state

  if (currentEquipped) {
    // Unequip current item first (returns to NPC's personal inventory)
    nextState = unequipItemFromNpcInternal(nextState, npcId, slot, currentEquipped)
  }

  // Use canonical transfer to move item to equipment slot
  // Determine source type based on where the item was found
  const fromType = itemLocation.containerType === 'npc_inventory' ? 'npc_inventory' : 'container'
  const fromId = itemLocation.containerId

  const transferParams: TransferItemParams = {
    fromType,
    fromId,
    toType: 'equipment',
    toId: npcId,
    itemInstanceId,
    quantity: 1,
  }

  nextState = transferItem(nextState, transferParams)
  if (nextState === state) {
    // Transfer failed
    return state
  }

  // Update NPC equipment slots. Builds a fresh npc object rather than mutating the one found
  // via .find() -- that object is the same reference living in nextState.npcRuntimeStates (and,
  // when this command is called directly rather than through an Immer-wrapped reducer, the same
  // reference the caller's own state still points to), so mutating it in place corrupted shared
  // state instead of producing a new immutable state (confirmed via cross-test pollution: a
  // mutation from one test's NPC equip call was still visible in a later test sharing the same
  // base fixture object).
  const npcToUpdate = nextState.npcRuntimeStates.find((n) => n.npcId === npcId)!
  let updatedEquipment = { ...npcToUpdate.equipment }

  if (slot === 'accessory_1') {
    const currentAccessories = npcToUpdate.equipment.accessory || []
    updatedEquipment = { ...updatedEquipment, accessory: [...currentAccessories.slice(0, 1), itemInstanceId] }
  } else if (slot === 'accessory_2') {
    const currentAccessories = npcToUpdate.equipment.accessory || []
    updatedEquipment = {
      ...updatedEquipment,
      accessory: currentAccessories.length >= 2
        ? [...currentAccessories.slice(1), itemInstanceId]
        : [...currentAccessories, itemInstanceId],
    }
  } else {
    const equipSlot: 'weapon' | 'armor' = slot === 'weapon' || slot === 'armor' ? slot : 'weapon'
    updatedEquipment = { ...updatedEquipment, [equipSlot]: itemInstanceId }
  }

  // Calculate stat bonuses for new equipment
  let updatedAttributes = npcToUpdate.attributes
  if (itemDef.category === 'weapon') {
    const weapon = itemDef as import('../../../domain/items/contracts').WeaponDefinition
    updatedAttributes = {
      ...updatedAttributes,
      might: Math.min(100, updatedAttributes.might + Math.floor((weapon.damageMin + weapon.damageMax) / 20)),
      agility: Math.min(100, updatedAttributes.agility + Math.floor(weapon.accuracy / 20)),
    }
  } else if (itemDef.category === 'armor') {
    const armor = itemDef as import('../../../domain/items/contracts').ArmorDefinition
    updatedAttributes = {
      ...updatedAttributes,
      endurance: Math.min(100, updatedAttributes.endurance + Math.floor(armor.soak / 20)),
    }
  }

  // destiny-mv8n follow-up: combat.ts/combatants.ts and selectors/roster.ts read npc.loadout
  // (primaryWeaponId/secondaryWeaponId/armorId), NOT npc.equipment -- they were never migrated to
  // the newer container-based equipment field. Writing only to `equipment` (as this function did)
  // left the roster display and combat damage/soak calculations completely unaffected: the player
  // could equip an item and see zero change anywhere else, which is exactly the reported bug.
  // transferItem's own addToEquipment ALSO tries to update loadout as a side effect of the
  // toType:'equipment' transfer above, but it resolves the item definition from
  // findItemInSource's itemId (which is hard-coded to equal the instance id for npc_inventory/
  // container sources, never resolved through itemRegistry) -- so it silently no-ops for any item
  // with a real, distinct instance id and only "worked" by accident when tests used
  // instanceId === itemId. Setting loadout explicitly here, from the itemDef this function already
  // correctly resolved via itemRegistry, replaces reliance on that broken side effect.
  const updatedLoadout = { ...npcToUpdate.loadout }
  if (slot === 'weapon') {
    updatedLoadout.primaryWeaponId = itemDef.id
  } else if (slot === 'accessory_1') {
    updatedLoadout.secondaryWeaponId = itemDef.id
  } else if (slot === 'armor') {
    updatedLoadout.armorId = itemDef.id
  } else if (slot === 'accessory_2') {
    const others = updatedLoadout.accessoryIds.filter((id) => id !== itemDef.id)
    updatedLoadout.accessoryIds = [...others, itemDef.id].slice(-2)
  }

  const updatedNpc: NpcRuntimeState = { ...npcToUpdate, equipment: updatedEquipment, attributes: updatedAttributes, loadout: updatedLoadout }
  const updatedRoster = [...nextState.npcRuntimeStates]
  updatedRoster[npcIndex] = updatedNpc

  return appendActivityLogEntry(
    { ...nextState, npcRuntimeStates: updatedRoster },
    'system',
    `${npc.name} equipped ${itemDef.name} in ${formatSlotName(slot)}`,
  )
}

/**
 * Internal unequip function that returns item to NPC's personal inventory.
 */
function unequipItemFromNpcInternal(state: GameState, npcId: string, slot: EquipmentSlotType, itemInstanceId: string): GameState {
  const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  // Get item definition from the item registry first
  const itemInstance = state.inventoryState.itemRegistry[itemInstanceId]
  if (!itemInstance) return state

  const itemDef = contentCatalog.itemsById.get(itemInstance.itemId)
  if (!itemDef) return state

  // Return to NPC's personal inventory using canonical transfer
  const transferParams: TransferItemParams = {
    fromType: 'equipment',
    fromId: npcId,
    toType: 'npc_inventory',
    toId: npcId,
    itemInstanceId,
    quantity: 1,
  }

  const nextState = transferItem(state, transferParams)
  if (nextState === state) {
    return state
  }

  // Update NPC equipment. `transferItem` (fromType:'equipment', called above) already ran
  // removeFromEquipment, which correctly clears exactly the one slot/array-entry matching
  // itemInstanceId -- updatedNpc.equipment (re-fetched from nextState below) already reflects that.
  // A prior version of this function re-sliced the accessory array here on top of that, assuming
  // the pre-removal shape: for a 2-entry array, removeFromEquipment already shifts index1 down to
  // index0, so re-slicing "index0 out" a second time silently dropped the SURVIVING accessory too
  // (found via test-quality pass, destiny-ukh4e -- confirmed via real test run, not just tracing).
  // Currently unreachable from the live UI (accessory_2 has no dispatchable slot name in
  // itemsReducers.ts), so no player has hit this, but a future accessory_2 UI wiring would have
  // silently lost the other equipped accessory on every accessory_1 re-equip/unequip.
  const updatedNpc = nextState.npcRuntimeStates.find((n) => n.npcId === npcId)!
  const updatedEquipment = { ...updatedNpc.equipment }

  // Remove stat bonuses
  const updatedAttributes = { ...updatedNpc.attributes }
  if (itemDef.category === 'weapon') {
    const weapon = itemDef as import('../../../domain/items/contracts').WeaponDefinition
    updatedAttributes.might = Math.max(0, updatedAttributes.might - Math.floor((weapon.damageMin + weapon.damageMax) / 20))
    updatedAttributes.agility = Math.max(0, updatedAttributes.agility - Math.floor(weapon.accuracy / 20))
  } else if (itemDef.category === 'armor') {
    const armor = itemDef as import('../../../domain/items/contracts').ArmorDefinition
    updatedAttributes.endurance = Math.max(0, updatedAttributes.endurance - Math.floor(armor.soak / 20))
  }

  // Mirror the loadout write in equipItemToNpc -- combat/roster read loadout, not equipment.
  const updatedLoadout = { ...updatedNpc.loadout }
  if (slot === 'weapon') {
    updatedLoadout.primaryWeaponId = null
  } else if (slot === 'accessory_1') {
    updatedLoadout.secondaryWeaponId = null
  } else if (slot === 'armor') {
    updatedLoadout.armorId = null
  } else if (slot === 'accessory_2') {
    updatedLoadout.accessoryIds = updatedLoadout.accessoryIds.filter((id) => id !== itemDef.id)
  }

  const updatedRoster = [...nextState.npcRuntimeStates]
  updatedRoster[npcIndex] = {
    ...updatedNpc,
    equipment: updatedEquipment,
    attributes: updatedAttributes,
    loadout: updatedLoadout,
  }

  return appendActivityLogEntry(
    { ...nextState, npcRuntimeStates: updatedRoster },
    'system',
    `${state.npcRuntimeStates[npcIndex].name} unequipped ${itemDef.name} from ${formatSlotName(slot)}`,
  )
}

/**
 * Unequip an item from an NPC.
 * Returns item to NPC's personal inventory.
 */
function unequipItemFromNpc(state: GameState, npcId: string, slot: EquipmentSlotType): GameState {
  const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return state

  const npc = state.npcRuntimeStates[npcIndex]

  const itemInstanceId: string | null = slot === 'accessory_1'
    ? npc.equipment.accessory?.[0] ?? null
    : slot === 'accessory_2'
      ? npc.equipment.accessory?.[1] ?? null
      : (npc.equipment[slot as 'weapon' | 'armor'] as string) ?? null

  if (!itemInstanceId) {
    // Defensive fallback: some NPCs (world/enemy/story persons hydrated via
    // createRuntimeStateFromDefinition, which has no state.inventoryState access to register a real
    // instance) can have loadout.armorId/primaryWeaponId/secondaryWeaponId set from authored
    // startingEquipment with no backing equipment[slot]/itemRegistry entry -- the UI still displays
    // them as equipped (EquipmentSection reads loadout, not equipment). Without this, clicking
    // Unequip on such an item silently did nothing: no error, no state change, item stays displayed
    // as equipped. There's no real item instance to return anywhere, so just clear the loadout field.
    return clearUnbackedLoadoutSlot(state, npcIndex, npc, slot)
  }

  return unequipItemFromNpcInternal(state, npcId, slot, itemInstanceId)
}

/**
 * Clears a loadout field that has no backing equipment[slot]/itemRegistry instance (unbacked
 * starting gear -- see unequipItemFromNpc's fallback branch above). Only weapon/armor/accessory_1
 * map 1:1 onto a single loadout field; accessory_2 folds into the accessoryIds array and isn't
 * reachable from this fallback (not part of the reported bug, and ambiguous which id to drop).
 */
function clearUnbackedLoadoutSlot(state: GameState, npcIndex: number, npc: NpcRuntimeState, slot: EquipmentSlotType): GameState {
  let clearedItemId: string | null = null
  let updatedLoadout = npc.loadout

  if (slot === 'weapon' && npc.loadout.primaryWeaponId) {
    clearedItemId = npc.loadout.primaryWeaponId
    updatedLoadout = { ...updatedLoadout, primaryWeaponId: null }
  } else if (slot === 'armor' && npc.loadout.armorId) {
    clearedItemId = npc.loadout.armorId
    updatedLoadout = { ...updatedLoadout, armorId: null }
  } else if (slot === 'accessory_1' && npc.loadout.secondaryWeaponId) {
    clearedItemId = npc.loadout.secondaryWeaponId
    updatedLoadout = { ...updatedLoadout, secondaryWeaponId: null }
  }

  if (!clearedItemId) return state

  const itemName = contentCatalog.itemsById.get(clearedItemId)?.name ?? clearedItemId
  const updatedRoster = [...state.npcRuntimeStates]
  updatedRoster[npcIndex] = { ...npc, loadout: updatedLoadout }

  return appendActivityLogEntry(
    { ...state, npcRuntimeStates: updatedRoster },
    'system',
    `${npc.name} unequipped ${itemName} from ${formatSlotName(slot)}`,
  )
}

/**
 * Unequip item from player or NPC.
 */
export function unequipItem(state: GameState, params: { ownerId: string; slot: EquipmentSlotType }): GameState {
  const { ownerId, slot } = params

  if (ownerId === 'player') {
    return unequipItemFromPlayer(state, slot)
  }

  return unequipItemFromNpc(state, ownerId, slot)
}

/**
 * Add a slot entry to player containers.
 */
function addSlotToPlayerContainers(state: GameState, itemInstanceId: string, quantity: number): import('../../../domain/inventory/contracts').InventoryContainer[] {
  // Try to find existing slot first
  const existingContainerIndex = state.inventoryState.player.bagContainers.findIndex((c) =>
    c.slots.some((s) => s.itemInstanceId === itemInstanceId)
  )

  if (existingContainerIndex !== -1) {
    const container = state.inventoryState.player.bagContainers[existingContainerIndex]
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemInstanceId)

    if (slotIndex !== -1) {
      const updatedSlots = [...container.slots]
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        quantity: updatedSlots[slotIndex].quantity + quantity,
      }
      const updatedContainers = [...state.inventoryState.player.bagContainers]
      updatedContainers[existingContainerIndex] = { ...container, slots: updatedSlots }
      return updatedContainers
    }
  }

  // Find container with space
  for (let i = 0; i < state.inventoryState.player.bagContainers.length; i++) {
    const container = state.inventoryState.player.bagContainers[i]
    if (container.slots.length < container.maxSlots) {
      const updatedSlots = [...container.slots, { slotId: `slot-${itemInstanceId}-${Date.now()}`, itemInstanceId, quantity }]
      const updatedContainers = [...state.inventoryState.player.bagContainers]
      updatedContainers[i] = { ...container, slots: updatedSlots }
      return updatedContainers
    }
  }

  // Create new container
  return [
    ...state.inventoryState.player.bagContainers,
    {
      containerId: `bag-${Date.now()}`,
      containerType: 'backpack',
      ownerId: 'player',
      maxSlots: 20,
      slots: [{ slotId: `slot-${itemInstanceId}-new`, itemInstanceId, quantity }],
      locked: false,
    },
  ]
}

/**
 * Get item name from catalog or itemInstanceId.
 */
function getItemName(itemInstanceId: string): string {
  // Try to find in catalog (itemInstanceId might be the same as itemId for now)
  const itemDef = contentCatalog.itemsById.get(itemInstanceId)
  if (itemDef) return itemDef.name
  return itemInstanceId
}

/**
 * Check if item can be equipped in the given slot.
 */
function isValidSlotForItem(item: import('../../../domain/items/contracts').ItemDefinition, slot: EquipmentSlotType): boolean {
  if (slot === 'weapon') {
    return item.category === 'weapon'
  }
  if (slot === 'armor') {
    return item.category === 'armor'
  }
  if (slot === 'accessory_1') {
    // itemsReducers.ts's UI slot mapping treats accessory_1 as the NPC "secondary weapon" slot
    // (ItemSelectionModal's 'secondaryWeaponId' -> equipItemToNpc's 'accessory_1'), so weapons
    // must be allowed here -- rejecting them made equipping a secondary weapon on any roster NPC
    // silently no-op regardless of the loadout-sync fix (destiny-mv8n). Still not valid for armor.
    return item.category !== 'armor'
  }
  if (slot === 'accessory_2') {
    return item.category !== 'weapon' && item.category !== 'armor'
  }
  return false
}

/**
 * Format slot type for display.
 */
function formatSlotName(slot: EquipmentSlotType): string {
  switch (slot) {
    case 'weapon':
      return 'weapon slot'
    case 'armor':
      return 'armor slot'
    case 'accessory_1':
      return 'accessory slot 1'
    case 'accessory_2':
      return 'accessory slot 2'
    default:
      return slot
  }
}
