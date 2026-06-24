import { createSelector } from '@reduxjs/toolkit'

import type { GameState } from '../../domain/game/contracts'
import type { CorridorCoalition } from '../../domain/expedition/contracts'

/**
 * Select all active coalitions.
 */
export const selectActiveCoalitions = (state: { game: GameState }): CorridorCoalition[] =>
  state.game.cityResources.activeCoalitions

/**
 * Select coalition by ID.
 */
export const selectCoalitionById = (coalitionId: string) =>
  createSelector([selectActiveCoalitions], (coalitions) =>
    coalitions.find((c) => c.id === coalitionId)
  )

/**
 * Select coalition history (completed coalitions).
 */
export const selectCoalitionHistory = (limit?: number) =>
  createSelector(
    [(state: { game: GameState }) => state.game.cityResources.coalitionHistory],
    (history) => (limit ? history.slice(-limit) : history)
  )

/**
 * Select coalition member contribution.
 */
export const selectCoalitionMemberContribution = (coalitionId: string, npcId: string) =>
  createSelector([selectActiveCoalitions], (coalitions) => {
    const coalition = coalitions.find((c) => c.id === coalitionId)
    const member = coalition?.members.find((m) => m.npcId === npcId)
    return member?.contribution ?? 0
  })

/**
 * Select NPCs currently in any active coalition.
 */
export const selectCoalitionNpcIds = createSelector([selectActiveCoalitions], (coalitions) =>
  [...new Set(coalitions.flatMap((c) => c.members.map((m) => m.npcId)))]
)

/**
 * Select coalitions by status.
 */
export const selectCoalitionsByStatus = (status: CorridorCoalition['status']) =>
  createSelector([selectActiveCoalitions], (coalitions) =>
    coalitions.filter((c) => c.status === status)
  )
