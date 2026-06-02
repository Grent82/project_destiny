import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

const selectGame = (state: RootState) => state.game

export const selectPendingEvents = createSelector([selectGame], (game) =>
  game.pendingEvents.filter((event) => event.firedOnDay <= game.day),
)

export const selectPendingEventsCount = (state: RootState) =>
  selectPendingEvents(state).length

export const selectFirstPendingEvent = (state: RootState) => {
  const pending = selectPendingEvents(state)[0]
  if (!pending) return null
  const template = contentCatalog.eventsById.get(pending.eventId)
  return template ?? null
}

export const selectLastResolvedEventSummary = (state: RootState) =>
  state.game.lastResolvedEventSummary
