import type { GameState } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'
import { EVENT_IDS } from '../content/ids'

export function recognizeHeir(state: GameState, heirId: string): GameState {
  const heir = state.house.houseHeirs.find((h) => h.id === heirId)
  if (!heir) return state
  if (heir.legitimacyStatus === 'recognized') return state

  const next: GameState = {
    ...state,
    house: {
      ...state.house,
      houseHeirs: state.house.houseHeirs.map((h) =>
        h.id === heirId ? { ...h, legitimacyStatus: 'recognized' as const } : h,
      ),
    },
  }

  const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === EVENT_IDS.HEIR_ANNOUNCEMENT)
  if (alreadyPending) return next

  const withEvent: GameState = {
    ...next,
    pendingEvents: [...next.pendingEvents, { eventId: EVENT_IDS.HEIR_ANNOUNCEMENT, firedOnDay: next.day }],
  }

  return appendActivityLogEntry(
    withEvent,
    'system',
    `${heir.name} is recognized as the Valdris heir. The city will know before nightfall.`,
  )
}
