import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'

export type CarryCategory = 'document' | 'tradeGood' | 'tool' | 'material' | 'consumable' | 'other'

/** Max slots per category in a mission pack. null = no hard limit. */
export const EXPEDITION_CARRY_LIMITS: Record<CarryCategory, number | null> = {
  document: 5,
  tradeGood: 8,
  tool: 2,
  material: 8,
  consumable: null, // governed by NPC loadout
  other: null,
}

/** Map item category strings to CarryCategory keys. */
function toCarryCategory(itemCategory: string): CarryCategory {
  switch (itemCategory) {
    case 'document': return 'document'
    case 'tradeGood': return 'tradeGood'
    case 'tool': return 'tool'
    case 'material': return 'material'
    case 'consumable': return 'consumable'
    default: return 'other'
  }
}

/** Helper to get items from mission_pack container */
function getMissionPackItems(inventoryState: GameState['inventoryState']): { instanceId: string; itemId: string; quantity: number }[] {
  const items: { instanceId: string; itemId: string; quantity: number }[] = []
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'mission_pack') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }
  }
  return items
}

export type CarryCategoryLoad = {
  category: CarryCategory
  used: number
  limit: number | null
  overLimit: boolean
}

/**
 * Computes the carry load for all mission_pack items grouped by category.
 * Used to show carry summary on MissionPrepScreen and enforce departure gate.
 */
export const selectExpeditionCarryLoad = createSelector(
  (state: RootState) => state.game.inventoryState,
  (inventoryState): CarryCategoryLoad[] => {
    const missionItems = getMissionPackItems(inventoryState)

    const counts: Partial<Record<CarryCategory, number>> = {}

    for (const item of missionItems) {
      const def = contentCatalog.itemsById.get(item.itemId)
      const cat = def ? toCarryCategory(def.category) : 'other'
      counts[cat] = (counts[cat] ?? 0) + item.quantity
    }

    return (Object.keys(EXPEDITION_CARRY_LIMITS) as CarryCategory[]).map((cat) => {
      const used = counts[cat] ?? 0
      const limit = EXPEDITION_CARRY_LIMITS[cat]
      return {
        category: cat,
        used,
        limit,
        overLimit: limit !== null && used > limit,
      }
    })
  },
)

/** Returns true if any category is over its carry limit. */
export const selectIsExpeditionOverCarryLimit = createSelector(
  selectExpeditionCarryLoad,
  (load) => load.some((c) => c.overLimit),
)
