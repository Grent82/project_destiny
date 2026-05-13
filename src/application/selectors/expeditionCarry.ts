/**
 * Expedition carry limits — slot/category caps enforced at mission departure.
 *
 * Limits are authored constants, not GameState fields.
 * Consumables are governed by NPC loadout slots (not included here).
 */

import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export type CarryCategory = 'document' | 'trade_good' | 'tool' | 'material' | 'consumable' | 'other'

/** Max slots per category in a mission pack. null = no hard limit. */
export const EXPEDITION_CARRY_LIMITS: Record<CarryCategory, number | null> = {
  document: 5,
  trade_good: 8,
  tool: 2,
  material: 8,
  consumable: null, // governed by NPC loadout
  other: null,
}

/** Map item category strings (including legacy variants) to CarryCategory keys */
function toCarryCategory(itemCategory: string): CarryCategory {
  switch (itemCategory) {
    case 'document': return 'document'
    case 'trade_good':
    case 'tradeGood': return 'trade_good'
    case 'tool': return 'tool'
    case 'material': return 'material'
    case 'consumable': return 'consumable'
    default: return 'other'
  }
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
  (state: RootState) => state.game.ownedItems,
  (ownedItems): CarryCategoryLoad[] => {
    const missionItems = ownedItems.filter((i) => i.location === 'mission_pack')

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
