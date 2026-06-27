/**
 * Equip Armor Command
 *
 * Allows an NPC to equip an armor item to a specific armor layer.
 * Armor layers: light-torso, light-legs, heavy-torso, heavy-legs, shield
 *
 * Guards:
 * - NPC must exist in roster
 * - Armor layer must be valid
 * - Item must exist in content catalog
 * - Item must be an armor item (category: armor)
 */

import type { GameState } from '../../../domain'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'

export interface EquipArmorParams {
  npcId: string
  layer: 'lightTorso' | 'lightLegs' | 'heavyTorso' | 'heavyLegs' | 'shield'
  itemId: string
}

/**
 * Checks if an item is a valid armor item for the given layer.
 */
function isValidArmorItem(item: unknown, layer: string): boolean {
  if (!item || typeof item !== 'object' || !('category' in item)) return false

  const category = (item as { category: string }).category
  const tags = (item as { tags?: string[] }).tags || []

  if (category !== 'armor') return false

  // Check if item has the correct layer tag
  const layerTagMap: Record<string, string> = {
    lightTorso: 'light-torso',
    lightLegs: 'light-legs',
    heavyTorso: 'heavy-torso',
    heavyLegs: 'heavy-legs',
    shield: 'shield',
  }

  return tags.includes(layerTagMap[layer])
}

/**
 * Equips an armor item to an NPC's armor layer.
 */
export function equipArmor(state: GameState, params: EquipArmorParams): GameState {
  const { npcId, layer, itemId } = params

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) {
    return state
  }

  const item = contentCatalog.itemsById.get(itemId)
  if (!item) {
    return state
  }

  if (!isValidArmorItem(item, layer)) {
    return state
  }

  // Check if NPC already has this item equipped
  const currentItemId = npc.armor[layer]
  if (currentItemId === itemId) {
    return state
  }

  // Unequip current item if any
  let newState = state
  if (currentItemId) {
    newState = {
      ...newState,
      roster: newState.roster.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              armor: {
                ...n.armor,
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
            armor: {
              ...n.armor,
              [layer]: itemId,
            },
          }
        : n,
    ),
  }

  const itemName = item.name || itemId
  return appendActivityLogEntry(
    newState,
    'system',
    `${npc.name} equips ${itemName} on the ${layer} armor layer.`,
  )
}

/**
 * Unequips an armor item from an NPC's armor layer.
 */
export interface UnequipArmorParams {
  npcId: string
  layer: 'lightTorso' | 'lightLegs' | 'heavyTorso' | 'heavyLegs' | 'shield'
}

export function unequipArmor(state: GameState, params: UnequipArmorParams): GameState {
  const { npcId, layer } = params

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) {
    return state
  }

  const currentItemId = npc.armor[layer]
  if (!currentItemId) {
    return state
  }

  const item = contentCatalog.itemsById.get(currentItemId)
  const itemName = item?.name || currentItemId

  const newState = {
    ...state,
    roster: state.roster.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            armor: {
              ...n.armor,
              [layer]: null,
            },
          }
        : n,
    ),
  }

  return appendActivityLogEntry(
    newState,
    'system',
    `${npc.name} unequips ${itemName} from the ${layer} armor layer.`,
  )
}
