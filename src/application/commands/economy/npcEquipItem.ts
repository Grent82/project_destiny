/**
 * Equip an item on an NPC.
 *
 * This command handles:
 * 1. Verifying the NPC owns the item (in inventoryState.npcInventories)
 * 2. Validating the item is appropriate for the slot
 * 3. Unequipping any current item in that slot
 * 4. Equipping the new item
 * 5. Updating NPC stats based on the new equipment
 */

import { type GameState } from '../../../domain/game/contracts'
import { type NpcRuntimeState } from '../../../domain/npc/contracts'
import { type ItemDefinition, type WeaponDefinition, type ArmorDefinition } from '../../../domain/items/contracts'
import { contentCatalog } from '../../content/contentCatalog'
import { appendActivityLogEntry } from '../activityLog'

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory'

export interface EquipItemParams {
  npcId: string
  itemId: string
  slot: EquipmentSlot
}

/**
 * Check if an item can be equipped in the given slot.
 */
function canEquipInSlot(item: ItemDefinition, slot: EquipmentSlot): boolean {
  if (slot === 'weapon') {
    return item.category === 'weapon'
  }
  if (slot === 'armor') {
    return item.category === 'armor'
  }
  if (slot === 'accessory') {
    // For now, allow any item that's not weapon/armor to be equipped as accessory
    return item.category !== 'weapon' && item.category !== 'armor'
  }
  return false
}

/**
 * Calculate stat bonuses from an equipment item.
 */
function calculateStatBonuses(item: ItemDefinition): Partial<NpcRuntimeState['attributes']> {
  const bonuses: Partial<NpcRuntimeState['attributes']> = {}

  if (item.category === 'weapon') {
    const weapon = item as WeaponDefinition
    bonuses.might = Math.floor((weapon.damageMin + weapon.damageMax) / 2 / 10)
    bonuses.agility = Math.floor(weapon.accuracy / 10)
  }

  if (item.category === 'armor') {
    const armor = item as ArmorDefinition
    bonuses.endurance = Math.floor(armor.soak / 10)
  }

  return bonuses
}

/**
 * Apply equipment stat bonuses to an NPC.
 */
function applyEquipmentBonuses(npc: NpcRuntimeState, item: ItemDefinition): NpcRuntimeState {
  const bonuses = calculateStatBonuses(item)

  return {
    ...npc,
    attributes: {
      ...npc.attributes,
      ...bonuses,
    },
  }
}

/**
 * Remove equipment stat bonuses from an NPC.
 */
function removeEquipmentBonuses(npc: NpcRuntimeState, item: ItemDefinition): NpcRuntimeState {
  const bonuses = calculateStatBonuses(item)

  return {
    ...npc,
    attributes: {
      ...npc.attributes,
      might: Math.max(0, npc.attributes.might - (bonuses.might ?? 0)),
      agility: Math.max(0, npc.attributes.agility - (bonuses.agility ?? 0)),
      endurance: Math.max(0, npc.attributes.endurance - (bonuses.endurance ?? 0)),
    },
  }
}

/**
 * Find an item in an NPC's inventory containers.
 */
function findItemInNpcInventory(containers: import('../../../domain/inventory/contracts').InventoryContainer[], itemId: string): { containerIndex: number; slotIndex: number; quantity: number } | null {
  if (!containers) return null

  for (const [containerIndex, container] of containers.entries()) {
    for (const [slotIndex, slot] of container.slots.entries()) {
      if (slot.itemInstanceId === itemId && slot.quantity > 0) {
        return { containerIndex, slotIndex, quantity: slot.quantity }
      }
    }
  }
  return null
}

/**
 * Equip an item on an NPC.
 *
 * @param state - Current game state
 * @param params.npcId - ID of the NPC to equip
 * @param params.itemId - ID of the item to equip (itemInstanceId)
 * @param params.slot - Slot to equip the item in
 * @returns Updated game state
 */
export function npcEquipItem(state: GameState, params: EquipItemParams): GameState {
  const { npcId, itemId, slot } = params

  const npcIndex = state.npcRuntimeStates.findIndex((r) => r.npcId === npcId)
  if (npcIndex === -1) {
    return state
  }

  const npc = state.npcRuntimeStates[npcIndex]

  const itemDef = contentCatalog.itemsById.get(itemId)
  if (!itemDef) {
    return state
  }

  if (!canEquipInSlot(itemDef, slot)) {
    return state
  }

  // Get NPC's inventory containers from inventoryState
  const npcContainers = state.inventoryState.npcInventories[npcId] || []

  // Check if the NPC owns this item
  const itemLocation = findItemInNpcInventory(npcContainers, itemId)
  if (!itemLocation) {
    return state
  }

  // Create a deep copy of the NPC
  const updatedNpc: NpcRuntimeState = {
    ...npc,
    equipment: {
      ...npc.equipment,
    },
  }

  // If there's a current item in this slot, unequip it first
  const currentItemId = updatedNpc.equipment[slot as 'weapon' | 'armor'] as string | null
  if (currentItemId) {
    // Return unequipped item to inventory
    const existingContainers = state.inventoryState.npcInventories[npcId] || []
    const updatedContainers = [...existingContainers]

    // Find a container with space or create new one
    let added = false
    for (const container of updatedContainers) {
      if (container.slots.length < container.maxSlots) {
        container.slots.push({
          slotId: `slot-${currentItemId}-${Date.now()}`,
          itemInstanceId: currentItemId,
          quantity: 1,
        })
        added = true
        break
      }
    }

    if (!added) {
      // Create new container
      updatedContainers.push({
        containerId: `npc-container-${Date.now()}`,
        containerType: 'backpack',
        ownerId: npcId,
        maxSlots: 20,
        slots: [{ slotId: `slot-${currentItemId}-new`, itemInstanceId: currentItemId, quantity: 1 }],
        locked: false,
      })
    }

    const newState = {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          ...state.inventoryState.npcInventories,
          [npcId]: updatedContainers,
        },
      },
    }

    // Remove stat bonuses from unequipped item
    const currentItemDef = contentCatalog.itemsById.get(currentItemId)
    if (currentItemDef) {
      updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, currentItemDef).attributes
    }

    // Equip the new item
    updatedNpc.equipment[slot as 'weapon' | 'armor'] = itemId

    // Remove item from inventory
    const container = updatedContainers[itemLocation.containerIndex]
    if (container) {
      const updatedSlots = [...container.slots]
      if (itemLocation.quantity <= 1) {
        updatedSlots.splice(itemLocation.slotIndex, 1)
      } else {
        updatedSlots[itemLocation.slotIndex] = {
          ...updatedSlots[itemLocation.slotIndex],
          quantity: itemLocation.quantity - 1,
        }
      }
      updatedContainers[itemLocation.containerIndex] = { ...container, slots: updatedSlots }
    }

    // Apply stat bonuses from new equipment
    updatedNpc.attributes = applyEquipmentBonuses(updatedNpc, itemDef).attributes

    // Update roster and inventoryState
    const updatedRoster = [...state.npcRuntimeStates]
    updatedRoster[npcIndex] = updatedNpc

    const result = {
      ...newState,
      npcRuntimeStates: updatedRoster,
      inventoryState: {
        ...newState.inventoryState,
        npcInventories: {
          ...newState.inventoryState.npcInventories,
          [npcId]: updatedContainers,
        },
      },
    }

    appendActivityLogEntry(result, 'system', `${npc.name} equipped ${itemDef.name} in ${slot} slot`)
    return result
  }

  // Handle accessories (can have multiple)
  if (slot === 'accessory') {
    const currentAccessories = updatedNpc.equipment.accessory || []
    const containersToUpdate = [...npcContainers]

    if (currentAccessories.length >= 2) {
      // Remove the first accessory to make room
      const removedAccessoryId = currentAccessories[0]
      if (removedAccessoryId) {
        // Return removed accessory to inventory
        let added = false
        for (const container of containersToUpdate) {
          if (container.slots.length < container.maxSlots) {
            container.slots.push({
              slotId: `slot-${removedAccessoryId}-${Date.now()}`,
              itemInstanceId: removedAccessoryId,
              quantity: 1,
            })
            added = true
            break
          }
        }

        if (!added) {
          containersToUpdate.push({
            containerId: `npc-container-${Date.now()}`,
            containerType: 'backpack',
            ownerId: npcId,
            maxSlots: 20,
            slots: [{ slotId: `slot-${removedAccessoryId}-new`, itemInstanceId: removedAccessoryId, quantity: 1 }],
            locked: false,
          })
        }

        const currentItemDef = contentCatalog.itemsById.get(removedAccessoryId)
        if (currentItemDef) {
          updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, currentItemDef).attributes
        }
      }

      // Shift accessories: [1] becomes [0], new item becomes [1]
      updatedNpc.equipment.accessory = [...currentAccessories.slice(1), itemId]
    } else {
      // Just add to available slot
      updatedNpc.equipment.accessory = [...currentAccessories, itemId]
    }

    // Remove the newly equipped item from inventory
    const container = containersToUpdate[itemLocation.containerIndex]
    if (container) {
      const updatedSlots = [...container.slots]
      if (itemLocation.quantity <= 1) {
        updatedSlots.splice(itemLocation.slotIndex, 1)
      } else {
        updatedSlots[itemLocation.slotIndex] = {
          ...updatedSlots[itemLocation.slotIndex],
          quantity: itemLocation.quantity - 1,
        }
      }
      containersToUpdate[itemLocation.containerIndex] = { ...container, slots: updatedSlots }
    }

    // Apply stat bonuses from new equipment
    updatedNpc.attributes = applyEquipmentBonuses(updatedNpc, itemDef).attributes

    // Update roster and inventoryState
    const updatedRoster = [...state.npcRuntimeStates]
    updatedRoster[npcIndex] = updatedNpc

    const result = {
      ...state,
      npcRuntimeStates: updatedRoster,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          ...state.inventoryState.npcInventories,
          [npcId]: containersToUpdate,
        },
      },
    }

    appendActivityLogEntry(result, 'system', `${npc.name} equipped ${itemDef.name} in accessory slot`)
    return result
  }

  // For weapon/armor slots
  updatedNpc.equipment[slot as 'weapon' | 'armor'] = itemId

  // Remove from inventory
  const updatedContainers = [...npcContainers]
  const container = updatedContainers[itemLocation.containerIndex]
  if (container) {
    const updatedSlots = [...container.slots]
    if (itemLocation.quantity <= 1) {
      updatedSlots.splice(itemLocation.slotIndex, 1)
    } else {
      updatedSlots[itemLocation.slotIndex] = {
        ...updatedSlots[itemLocation.slotIndex],
        quantity: itemLocation.quantity - 1,
      }
    }
    updatedContainers[itemLocation.containerIndex] = { ...container, slots: updatedSlots }
  }

  // Apply stat bonuses from new equipment
  updatedNpc.attributes = applyEquipmentBonuses(updatedNpc, itemDef).attributes

  // Update roster and inventoryState
  const updatedRoster = [...state.npcRuntimeStates]
  updatedRoster[npcIndex] = updatedNpc

  const result = {
    ...state,
    npcRuntimeStates: updatedRoster,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: {
        ...state.inventoryState.npcInventories,
        [npcId]: updatedContainers,
      },
    },
  }

  appendActivityLogEntry(result, 'system', `${npc.name} equipped ${itemDef.name} in ${slot} slot`)
  return result
}

/**
 * Unequip an item from an NPC.
 *
 * @param state - Current game state
 * @param params.npcId - ID of the NPC
 * @param params.slot - Slot to unequip
 * @returns Updated game state
 */
export function npcUnequipItem(state: GameState, params: { npcId: string; slot: EquipmentSlot }): GameState {
  const { npcId, slot } = params

  const npcIndex = state.npcRuntimeStates.findIndex((r) => r.npcId === npcId)
  if (npcIndex === -1) {
    return state
  }

  const npc = state.npcRuntimeStates[npcIndex]

  // Get current item(s) for this slot
  let currentItemIds: string[] = []
  if (slot === 'accessory') {
    currentItemIds = npc.equipment?.accessory || []
  } else {
    const currentItemId = npc.equipment?.[slot as 'weapon' | 'armor'] as string | null
    if (currentItemId) {
      currentItemIds = [currentItemId]
    }
  }

  if (currentItemIds.length === 0) {
    return state
  }

  const updatedNpc: NpcRuntimeState = {
    ...npc,
    equipment: {
      ...npc.equipment,
    },
    attributes: { ...npc.attributes },
  }

  // Get current NPC containers
  const updatedContainers = [...(state.inventoryState.npcInventories[npcId] || [])]

  // Unequip each item and return to inventory
  for (const itemId of currentItemIds) {
    const itemDef = contentCatalog.itemsById.get(itemId)
    if (itemDef) {
      // Add to inventory
      let added = false
      for (const container of updatedContainers) {
        if (container.slots.length < container.maxSlots) {
          container.slots.push({
            slotId: `slot-${itemId}-${Date.now()}`,
            itemInstanceId: itemId,
            quantity: 1,
          })
          added = true
          break
        }
      }

      if (!added) {
        updatedContainers.push({
          containerId: `npc-container-${Date.now()}`,
          containerType: 'backpack',
          ownerId: npcId,
          maxSlots: 20,
          slots: [{ slotId: `slot-${itemId}-new`, itemInstanceId: itemId, quantity: 1 }],
          locked: false,
        })
      }

      // Remove stat bonuses
      updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, itemDef).attributes
    }
  }

  // Update equipment
  if (slot === 'accessory') {
    updatedNpc.equipment.accessory = []
  } else {
    updatedNpc.equipment[slot as 'weapon' | 'armor'] = null
  }

  const updatedRoster = [...state.npcRuntimeStates]
  updatedRoster[npcIndex] = updatedNpc

  const result = {
    ...state,
    npcRuntimeStates: updatedRoster,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: {
        ...state.inventoryState.npcInventories,
        [npcId]: updatedContainers,
      },
    },
  }

  const itemName = currentItemIds.map((id) => contentCatalog.itemsById.get(id)?.name || id).join(', ')
  appendActivityLogEntry(result, 'system', `${npc.name} unequipped ${itemName} from ${slot} slot`)
  return result
}
