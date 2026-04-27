import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export const selectPendingEvents = (state: RootState) => state.game.pendingEvents

export const selectFirstPendingEvent = (state: RootState) => {
  const pending = state.game.pendingEvents[0]
  if (!pending) return null
  const template = contentCatalog.eventsById.get(pending.eventId)
  return template ?? null
}
