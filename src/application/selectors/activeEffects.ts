import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

const selectGame = (state: RootState) => state.game

export interface ActiveStatusSummary {
  statusId: string
  source?: string
  value?: number
  remainingDuration: number | null
}

export interface ActiveTrainingBonusSummary {
  skill: string
  value: number
  source: string
}

export interface ActiveStatBoostSummary {
  stat: string
  value: number
  remainingDays: number
}

export interface EquippedToolSummary {
  itemId: string
  itemName: string
  skill: string
  value: number
}

export interface ActiveEffectsSummary {
  statuses: ActiveStatusSummary[]
  trainingBonuses: ActiveTrainingBonusSummary[]
  statBoosts: ActiveStatBoostSummary[]
  equippedTools: EquippedToolSummary[]
}

/**
 * Surfaces the player's item-driven effect state (destiny-y7jx): playerStatuses,
 * activeTrainingBonuses, tempStatBoosts, equippedTools. All four are written by useItem.ts/
 * equipItem.ts and expired/cleared by handleItemEffectsPhase.ts on the daily tick, but were
 * never read back to the player before this selector existed.
 *
 * Note: activeTrainingBonuses always clears entirely at the next day-end tick regardless of
 * any per-entry expiresDay (that field is written but never consulted) -- so bonuses granted
 * today last only until the day ends, which is reflected in the fixed 'today' label rather
 * than a computed day count.
 */
export const selectActiveEffectsSummary = createSelector([selectGame], (game): ActiveEffectsSummary => {
  const statuses: ActiveStatusSummary[] = game.playerStatuses.map((status) => ({
    statusId: status.statusId,
    source: status.source,
    value: status.value,
    remainingDuration: status.duration ?? null,
  }))

  const trainingBonuses: ActiveTrainingBonusSummary[] = game.activeTrainingBonuses.map((bonus) => ({
    skill: bonus.skill,
    value: bonus.value,
    source: bonus.source,
  }))

  const statBoosts: ActiveStatBoostSummary[] = game.tempStatBoosts.map((boost) => ({
    stat: boost.stat,
    value: boost.value,
    remainingDays: Math.max(0, boost.expiresDay - game.day),
  }))

  const equippedTools: EquippedToolSummary[] = game.equippedTools.map((tool) => ({
    itemId: tool.itemId,
    itemName: contentCatalog.itemsById.get(tool.itemId)?.name ?? tool.itemId,
    skill: tool.skill,
    value: tool.value,
  }))

  return { statuses, trainingBonuses, statBoosts, equippedTools }
})
