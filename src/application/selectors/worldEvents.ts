import { createSelector } from '@reduxjs/toolkit'

import type { WorldEventType, WorldEvent, GameState } from '../../domain'

/**
 * Select all world events (most recent first, max 100)
 */
export const selectWorldEvents = (state: { game: GameState }): WorldEvent[] =>
  state.game.worldEvents

/**
 * Select events filtered by type
 */
export const selectWorldEventsByType = (eventType: WorldEventType) =>
  createSelector([selectWorldEvents], (events): WorldEvent[] =>
    events.filter((event) => event.type === eventType)
  )

/**
 * Select the most recent N events
 */
export const selectRecentWorldEvents = (limit: number) =>
  createSelector([selectWorldEvents], (events): WorldEvent[] =>
    events.slice(0, limit)
  )

/**
 * Select events related to a specific NPC (as source or participant)
 */
export const selectEventsByNpcId = (npcId: string) =>
  createSelector([selectWorldEvents], (events): WorldEvent[] =>
    events.filter(
      (event) => event.sourceNpcId === npcId || event.relatedNpcIds.includes(npcId)
    )
  )

/**
 * Select events from a specific day
 */
export const selectEventsByDay = (day: number) =>
  createSelector([selectWorldEvents], (events): WorldEvent[] =>
    events.filter((event) => event.day === day)
  )

/**
 * Select coalition-related events
 */
export const selectCoalitionEvents = createSelector([selectWorldEvents], (events): WorldEvent[] =>
  events.filter((event) => event.type === 'coalition-formed' || event.type === 'coalition-dissolved')
)

/**
 * Select corridor-related events
 */
export const selectCorridorEvents = createSelector([selectWorldEvents], (events): WorldEvent[] =>
  events.filter((event) =>
    event.type === 'corridor-blocked' ||
    event.type === 'corridor-disrupted' ||
    event.type === 'corridor-cleared'
  )
)

/**
 * Select expedition-related events
 */
export const selectExpeditionEvents = createSelector([selectWorldEvents], (events): WorldEvent[] =>
  events.filter((event) =>
    event.type === 'expedition-started' ||
    event.type === 'expedition-complete' ||
    event.type === 'expedition-failed'
  )
)
