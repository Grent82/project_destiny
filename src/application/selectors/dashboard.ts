import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import {
  getRenownLevel,
  getRenownProgress,
  RENOWN_THRESHOLDS,
  RARITY_DESCRIPTIONS,
  RARITY_SKILL_CAPS,
} from '../../domain/progression/contracts'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'

const selectGame = (state: RootState) => state.game

export const selectDashboardSummary = createSelector([selectGame], (game) => {
  const roster = game.roster

  return {
    day: game.day,
    timeSlot: game.timeSlot,
    money: game.money,
    rosterCount: roster.length,
    deployedCount: roster.filter((npc) => npc.assignment === 'deployed').length,
    recoveringCount: roster.filter((npc) => npc.assignment === 'recovering').length,
    assignedSquadCount: game.selectedSquadNpcIds.length,
    cityDials: game.cityDials,
    recentActivity: game.activityLog.slice(0, 3),
  }
})

export const selectDebtStatus = createSelector([selectGame], (game) => ({
  debtAmount: game.debtAmount,
  debtDueDay: game.debtDueDay,
  debtPaid: game.debtPaid,
  debtCrisisTriggered: game.debtCrisisTriggered,
  daysRemaining: Math.max(0, game.debtDueDay - game.day),
  marks: game.money,
}))

export const selectProtagonistName = createSelector(
  [selectGame],
  (game) => game.protagonistName,
)

export const selectHasSeenOpening = createSelector(
  [selectGame],
  (game) => game.hasSeenOpening,
)

export const selectHouseDistrictId = createSelector(
  [selectGame],
  (game) => game.houseDistrictId,
)

export const selectPlayerCharacter = createSelector(
  [selectGame],
  (game) => game.playerCharacter,
)

export const selectMainQuest = createSelector(
  [selectGame],
  (game) => game.mainQuest,
)

export const selectDistrictTension = createSelector(
  [selectGame],
  (game) => game.districtTension,
)

/**
 * Returns the slot cost for a named action type.
 * Travel and combat each cost 1 slot; expeditions cost 2.
 * Suitable for use in TimeCostBadge.
 */
export function selectActionTimeCost(actionType: 'travel' | 'combat' | 'expedition' | 'wait' | 'sleep_brief' | 'sleep_full'): number {
  switch (actionType) {
    case 'expedition': return 2
    case 'sleep_full': return 4
    case 'travel':
    case 'combat':
    case 'wait':
    case 'sleep_brief':
    default:
      return 1
  }
}

// ── Renown selectors ────────────────────────────────────────────────────────

export const selectRenown = createSelector(
  [selectGame],
  (game) => game.playerCharacter.renown,
)

export const selectRenownLevel = createSelector(
  [selectRenown],
  (renown) => getRenownLevel(renown),
)

export const selectRenownProgress = createSelector(
  [selectRenown],
  (renown) => getRenownProgress(renown),
)

export const selectRenownThresholds = () => RENOWN_THRESHOLDS

// ── Rarity selectors (static, no state dependency) ─────────────────────────

export const selectRarityDescriptions = () => RARITY_DESCRIPTIONS
export const selectRaritySkillCaps = () => RARITY_SKILL_CAPS

// ── NPC state thresholds (static) ──────────────────────────────────────────

export const selectNpcStateThresholds = () => NPC_STATE_THRESHOLDS
