import { createSelector } from '@reduxjs/toolkit'

import type { GameState } from '../../domain/game/contracts'
import type { CorridorGroup } from '../../domain/expedition/contracts'

/**
 * Select all active groups.
 */
export const selectActiveCoalitions = (state: { game: GameState }): CorridorGroup[] =>
  state.game.cityResources.activeGroups

/**
 * Select group by ID.
 */
export const selectCoalitionById = (groupId: string) =>
  createSelector([selectActiveCoalitions], (groups) =>
    groups.find((c) => c.id === groupId)
  )

/**
 * Select group history (completed groups).
 */
export const selectCoalitionHistory = (limit?: number) =>
  createSelector(
    [(state: { game: GameState }) => state.game.cityResources.groupHistory],
    (history) => (limit ? history.slice(-limit) : history)
  )

/**
 * Select group member contribution.
 */
export const selectCoalitionMemberContribution = (groupId: string, npcId: string) =>
  createSelector([selectActiveCoalitions], (groups) => {
    const group = groups.find((c) => c.id === groupId)
    const member = group?.members.find((m) => m.npcId === npcId)
    return member?.contribution ?? 0
  })

/**
 * Select NPCs currently in any active group.
 */
export const selectCoalitionNpcIds = createSelector([selectActiveCoalitions], (groups) =>
  [...new Set(groups.flatMap((c) => c.members.map((m) => m.npcId)))]
)

/**
 * Select groups by status.
 */
export const selectCoalitionsByStatus = (status: CorridorGroup['status']) =>
  createSelector([selectActiveCoalitions], (groups) =>
    groups.filter((c) => c.status === status)
  )
