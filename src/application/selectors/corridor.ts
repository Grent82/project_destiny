import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { CorridorGroup } from '../../domain/expedition/contracts'
import { contentCatalog } from '../content/contentCatalog'

/**
 * Corridor status display options.
 */
export type CorridorStatusDisplay = 'blocked' | 'disrupted' | 'open'

/**
 * Select raw corridor status from city resources.
 */
export const selectCorridorStatusRaw = (state: RootState) =>
  state.game.cityResources.corridorStatus

/**
 * Select corridor clearance progress in days.
 */
export const selectCorridorClearanceProgressDays = (state: RootState) =>
  state.game.cityResources.corridorClearanceProgressDays

/**
 * Select active corridor groups (coalitions/expeditions).
 */
export const selectActiveCorridorGroups = (state: RootState): CorridorGroup[] =>
  state.game.cityResources.activeGroups

/**
 * Select historical corridor groups.
 */
export const selectCorridorGroupHistory = (state: RootState): CorridorGroup[] =>
  state.game.cityResources.groupHistory

/**
 * Formatted corridor status for display.
 */
export const selectCorridorStatusDisplay = createSelector(
  selectCorridorStatusRaw,
  (status): CorridorStatusDisplay => {
    switch (status) {
      case 'blocked':
        return 'blocked'
      case 'disrupted':
        return 'disrupted'
      case 'open':
        return 'open'
      default:
        return 'blocked'
    }
  },
)

/**
 * Progress percentage for corridor clearance (0-100).
 * Based on active groups' average progress or historical data.
 */
export const selectCorridorClearanceProgress = createSelector(
  selectActiveCorridorGroups,
  selectCorridorClearanceProgressDays,
  (activeGroups, progressDays) => {
    // If there are active groups, use their average progress
    if (activeGroups.length > 0) {
      const totalProgress = activeGroups.reduce((sum, group) => sum + group.progress, 0)
      return Math.round(totalProgress / activeGroups.length)
    }
    // Otherwise, use the days-based progress (cap at 100)
    return Math.min(100, progressDays)
  },
)

/**
 * Formatted active expeditions list for display.
 */
export type ActiveExpeditionItem = {
  id: string
  status: string
  memberCount: number
  progress: number
  estimatedReturnDay: number
  leaderName: string
  difficulty: number
}

export const selectActiveExpeditions = createSelector(
  selectActiveCorridorGroups,
  (activeGroups): ActiveExpeditionItem[] =>
    activeGroups.map((group) => {
      const leaderMember = group.members.find((m) => m.role === 'leader')
      // Look up NPC name from roster or world NPCs
      const leaderName = leaderMember
        ? contentCatalog.npcsById.get(leaderMember.npcId)?.name ?? `NPC-${leaderMember.npcId.slice(0, 8)}`
        : 'Unknown'

      return {
        id: group.id,
        status: group.status,
        memberCount: group.members.length,
        progress: group.progress,
        estimatedReturnDay: group.estimatedReturnDay,
        leaderName,
        difficulty: group.difficulty,
      }
    }),
)

/**
 * Formatted expedition history for display.
 */
export type ExpeditionHistoryItem = {
  id: string
  status: string
  memberCount: number
  finalProgress: number
  formedDay: number
  difficulty: number
}

export const selectExpeditionHistory = createSelector(
  selectCorridorGroupHistory,
  (history): ExpeditionHistoryItem[] =>
    history.map((group) => ({
      id: group.id,
      status: group.status,
      memberCount: group.members.length,
      finalProgress: group.progress,
      formedDay: group.formedDay,
      difficulty: group.difficulty,
    })),
)

/**
 * Summary of corridor state for quick display.
 */
export type CorridorSummary = {
  status: CorridorStatusDisplay
  progress: number
  activeExpeditionCount: number
  hasActiveExpeditions: boolean
}

export const selectCorridorSummary = createSelector(
  selectCorridorStatusDisplay,
  selectCorridorClearanceProgress,
  selectActiveCorridorGroups,
  (status, progress, activeGroups): CorridorSummary => ({
    status,
    progress,
    activeExpeditionCount: activeGroups.length,
    hasActiveExpeditions: activeGroups.length > 0,
  }),
)
