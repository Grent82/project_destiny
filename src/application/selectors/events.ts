import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export const selectPendingEvents = (state: RootState) =>
  state.game.pendingEvents.filter((event) => event.firedOnDay <= state.game.day)

export const selectPendingEventsCount = (state: RootState) =>
  selectPendingEvents(state).length

export const selectFirstPendingEvent = (state: RootState) => {
  const pending = selectPendingEvents(state)[0]
  if (!pending) return null
  const template = contentCatalog.eventsById.get(pending.eventId)
  return template ?? null
}
