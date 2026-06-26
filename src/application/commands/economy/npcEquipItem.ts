/**
 * Equip an item on an NPC.
 *
 * This command handles:
 * 1. Verifying the NPC owns the item (in inventory)
 * 2. Validating the item is appropriate for the slot
 * 3. Unequipping any current item in that slot
 * 4. Equipping the new item
 * 5. Updating NPC stats based on the new equipment
 */

import { type GameState } from '../../../domain/game/contracts'
import { type NpcRuntimeState } from '../../../domain/npc/contracts'
import { type ItemDefinition, type WeaponDefinition, type ArmorDefinition } from '../../../domain/items/contracts'
import { contentCatalog } from '../../content/contentCatalog'

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
    // This allows flexibility while proper accessory items are being defined
    return item.category !== 'weapon' && item.category !== 'armor'
  }
  return false
}

/**
 * Calculate stat bonuses from an equipment item.
 */
function calculateStatBonuses(item: ItemDefinition): Partial<NpcRuntimeState['attributes']> {
  const bonuses: Partial<NpcRuntimeState['attributes']> = {}

  // Weapon bonuses
  if (item.category === 'weapon') {
    const weapon = item as WeaponDefinition
    // Weapons primarily affect might (damage) and agility (speed/accuracy)
    bonuses.might = Math.floor((weapon.damageMin + weapon.damageMax) / 2 / 10)
    bonuses.agility = Math.floor(weapon.accuracy / 10)
  }

  // Armor bonuses
  if (item.category === 'armor') {
    const armor = item as ArmorDefinition
    // Armor affects endurance (survivability)
    bonuses.endurance = Math.floor(armor.soak / 10)
  }

  return bonuses
}

/**
 * Apply equipment stat bonuses to an NPC.
 * Note: This is a simplified implementation - in a full system, you'd want
 * to track base stats separately from equipment bonuses.
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
 * Equip an item on an NPC.
 *
 * @param state - Current game state
 * @param params.npcId - ID of the NPC to equip
 * @param params.itemId - ID of the item to equip
 * @param params.slot - Slot to equip the item in
 * @returns Updated game state
 */
export function npcEquipItem(state: GameState, params: EquipItemParams): GameState {
  const { npcId, itemId, slot } = params

  // Find the NPC
  const npcIndex = state.roster.findIndex((r) => r.npcId === npcId)
  if (npcIndex === -1) {
    return state
  }

  const npc = state.roster[npcIndex]

  // Get the item definition
  const itemDef = contentCatalog.itemsById.get(itemId)
  if (!itemDef) {
    return state
  }

  // Check if the item can be equipped in this slot
  if (!canEquipInSlot(itemDef, slot)) {
    return state
  }

  // Check if the NPC owns this item
  const inventoryIndex = npc.inventory.findIndex((inv) => inv.itemId === itemId)
  if (inventoryIndex === -1) {
    return state
  }

  // Create a deep copy of the NPC
  const updatedNpc: NpcRuntimeState = {
    ...npc,
    equipment: {
      ...npc.equipment,
    },
  }

  // If there's a current item in this slot, unequip it
  const currentItemId = updatedNpc.equipment[slot] as string | null
  if (currentItemId) {
    const currentItemDef = contentCatalog.itemsById.get(currentItemId)
    if (currentItemDef) {
      updatedNpc.inventory.push({
        itemId: currentItemId,
        quantity: 1,
      })
      // Remove stat bonuses from unequipped item
      updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, currentItemDef).attributes
    }
  }

  // Equip the new item
  if (slot === 'accessory') {
    // Accessories can have multiple slots (up to 2)
    const currentAccessories = updatedNpc.equipment.accessory || []
    if (currentAccessories.length >= 2) {
      // Remove the first accessory to make room
      const removedAccessoryId = currentAccessories[0]
      if (removedAccessoryId) {
        const removedItemDef = contentCatalog.itemsById.get(removedAccessoryId)
        if (removedItemDef) {
          updatedNpc.inventory.push({
            itemId: removedAccessoryId,
            quantity: 1,
          })
          updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, removedItemDef).attributes
        }
      }
      updatedNpc.equipment.accessory = [...currentAccessories.slice(1), itemId]
    } else {
      updatedNpc.equipment.accessory = [...currentAccessories, itemId]
    }
  } else {
    updatedNpc.equipment[slot] = itemId
  }

  // Remove from inventory
  if (slot !== 'accessory') {
    // For weapon/armor, remove one instance
    updatedNpc.inventory = [
      ...updatedNpc.inventory.slice(0, inventoryIndex),
      ...updatedNpc.inventory.slice(inventoryIndex + 1),
    ]
  } else {
    // For accessories, we need to handle it differently since we might have multiple
    const qty = updatedNpc.inventory[inventoryIndex]?.quantity || 1
    if (qty > 1) {
      updatedNpc.inventory[inventoryIndex] = {
        itemId,
        quantity: qty - 1,
      }
    } else {
      updatedNpc.inventory = [
        ...updatedNpc.inventory.slice(0, inventoryIndex),
        ...updatedNpc.inventory.slice(inventoryIndex + 1),
      ]
    }
  }

  // Apply stat bonuses from the new equipment
  updatedNpc.attributes = applyEquipmentBonuses(updatedNpc, itemDef).attributes

  // Update the roster
  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = updatedNpc

  return {
    ...state,
    roster: updatedRoster,
  }
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

  const npcIndex = state.roster.findIndex((r) => r.npcId === npcId)
  if (npcIndex === -1) {
    return state
  }

  const npc = state.roster[npcIndex]

  // Get the current item(s) for this slot
  let currentItemIds: string[] = []
  if (slot === 'accessory') {
    currentItemIds = npc.equipment?.accessory || []
  } else {
    const currentItemId = npc.equipment?.[slot] as string | null
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
    inventory: [...npc.inventory],
    attributes: { ...npc.attributes },
  }

  // Unequip each item and return to inventory
  for (const itemId of currentItemIds) {
    const itemDef = contentCatalog.itemsById.get(itemId)
    if (itemDef) {
      updatedNpc.inventory.push({
        itemId,
        quantity: 1,
      })
      updatedNpc.attributes = removeEquipmentBonuses(updatedNpc, itemDef).attributes
    }
  }

  if (slot === 'accessory') {
    updatedNpc.equipment.accessory = []
  } else {
    updatedNpc.equipment[slot] = null
  }

  const updatedRoster = [...state.roster]
  updatedRoster[npcIndex] = updatedNpc

  return {
    ...state,
    roster: updatedRoster,
  }
}
