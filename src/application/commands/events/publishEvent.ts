import { appendActivityLogEntry } from '../activityLog'
import type { GameState } from '../../../domain'
import type { WorldEvent, WorldEventType } from '../../../domain'

/**
 * Publish a world event and optionally add a player-visible activity log entry.
 * Pure function - takes state, returns new state with event added.
 * Events are capped at 100 (oldest removed when limit exceeded).
 */
export function publishEvent(
  state: GameState,
  eventType: WorldEventType,
  payload: Record<string, unknown>,
  source: 'system' | 'npc' | 'player',
  options: {
    sourceNpcId?: string
    relatedNpcIds?: string[]
    relatedQuestIds?: string[]
    activityLogMessage?: string
    activityLogCategory?: 'economy' | 'combat' | 'system'
  } = {}
): GameState {
  const {
    sourceNpcId,
    relatedNpcIds = [],
    relatedQuestIds = [],
    activityLogMessage,
    activityLogCategory = 'system',
  } = options

  const newEvent: WorldEvent = {
    eventId: crypto.randomUUID(),
    type: eventType,
    day: state.day,
    payload,
    source,
    sourceNpcId: sourceNpcId ?? null,
    relatedNpcIds,
    relatedQuestIds,
  }

  // Add new event to beginning, cap at 100
  const updatedEvents = [newEvent, ...state.worldEvents].slice(0, 100)

  // Add activity log entry if message provided
  let updatedState = { ...state, worldEvents: updatedEvents }
  if (activityLogMessage) {
    updatedState = appendActivityLogEntry(updatedState, activityLogCategory, activityLogMessage)
  }

  return updatedState
}
