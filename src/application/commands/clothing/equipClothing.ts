/**
 * Equip Clothing Command
 *
 * Allows an NPC to equip a clothing item to a specific layer.
 * If another item is already equipped on that layer, it is unequipped first.
 *
 * Guards:
 * - NPC must exist in roster
 * - Clothing layer must be valid
 * - Item must exist in content catalog
 * - Item must be a clothing item (category: consumable with clothing layer tag)
 */

import type { GameState } from '../../../domain'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'

export interface EquipClothingParams {
  npcId: string
  layer: 'head' | 'torso' | 'arms' | 'legs' | 'feet' | 'full' | 'undergarments'
  itemId: string
}

/**
 * Checks if an item is a valid clothing item for the given layer.
 */
function isValidClothingItem(item: unknown, layer: string): boolean {
  if (!item || typeof item !== 'object' || !('tags' in item)) return false

  const tags = (item as { tags: string[] }).tags
  // Check if item has the layer tag (head, torso, arms, legs, feet, full, undergarments)
  return tags.includes(layer)
}

/**
 * Equips a clothing item to an NPC's clothing layer.
 */
export function equipClothing(state: GameState, params: EquipClothingParams): GameState {
  const { npcId, layer, itemId } = params

  // Find NPC in roster
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) {
    return state // NPC not found, no change
  }

  // Get item from catalog
  const item = contentCatalog.itemsById.get(itemId)
  if (!item) {
    return state // Item not found, no change
  }

  // Validate item is clothing for the correct layer
  if (!isValidClothingItem(item, layer)) {
    return state // Invalid item for layer, no change
  }

  // Check if NPC already has this item equipped
  const currentItemId = npc.clothing[layer]
  if (currentItemId === itemId) {
    return state // Already equipped, no change
  }

  // Unequip current item if any (return to inventory if NPC has one)
  let newState = state
  if (currentItemId) {
    // TODO: Add item back to NPC's inventory when unequipping
    // For now, we just clear the slot
    newState = {
      ...newState,
      roster: newState.roster.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              clothing: {
                ...n.clothing,
                [layer]: null,
              },
            }
          : n,
      ),
    }
  }

  // Equip new item
  newState = {
    ...newState,
    roster: newState.roster.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            clothing: {
              ...n.clothing,
              [layer]: itemId,
            },
          }
        : n,
    ),
  }

  const itemName = item.name || itemId
  newState = appendActivityLogEntry(
    newState,
    'system',
    `${npc.name} equips ${itemName} on the ${layer} layer.`,
  )

  return newState
}

/**
 * Unequips a clothing item from an NPC's clothing layer.
 */
export interface UnequipClothingParams {
  npcId: string
  layer: 'head' | 'torso' | 'arms' | 'legs' | 'feet' | 'full' | 'undergarments'
}

export function unequipClothing(state: GameState, params: UnequipClothingParams): GameState {
  const { npcId, layer } = params

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) {
    return state
  }

  const currentItemId = npc.clothing[layer]
  if (!currentItemId) {
    return state // Nothing equipped, no change
  }

  const item = contentCatalog.itemsById.get(currentItemId)
  const itemName = item?.name || currentItemId

  // Remove from clothing
  const newState = {
    ...state,
    roster: state.roster.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            clothing: {
              ...n.clothing,
              [layer]: null,
            },
          }
        : n,
    ),
  }

  return appendActivityLogEntry(
    newState,
    'system',
    `${npc.name} unequips ${itemName} from the ${layer} layer.`,
  )
}
