import { describe, expect, it } from 'vitest'

import { publishEvent } from './publishEvent'
import { initialGameStateSnapshot } from '../../store/initialGameState'

describe('publishEvent', () => {
  it('adds a new event to the worldEvents array', () => {
    const result = publishEvent(
      initialGameStateSnapshot,
      'corridor-blocked',
      { reason: 'monster_activity', severity: 80 },
      'system'
    )

    expect(result.worldEvents).toHaveLength(1)
    expect(result.worldEvents[0].type).toBe('corridor-blocked')
    expect(result.worldEvents[0].day).toBe(initialGameStateSnapshot.day)
    expect(result.worldEvents[0].source).toBe('system')
  })

  it('assigns a unique eventId to each event', () => {
    const result1 = publishEvent(initialGameStateSnapshot, 'npc-hired', {}, 'npc')
    const result2 = publishEvent(result1, 'npc-departed', {}, 'npc')

    expect(result1.worldEvents[0].eventId).not.toBe(result2.worldEvents[0].eventId)
  })

  it('preserves payload data in the event', () => {
    const payload = {
      npcId: 'npc-test',
      npcName: 'Test NPC',
      districtId: 'district-the-pale',
      wage: 50,
    }

    const result = publishEvent(initialGameStateSnapshot, 'npc-hired', payload, 'player')

    expect(result.worldEvents[0].payload).toEqual(payload)
  })

  it('tracks sourceNpcId when provided', () => {
    const result = publishEvent(
      initialGameStateSnapshot,
      'expedition-started',
      {},
      'npc',
      { sourceNpcId: 'npc-verek-sorn' }
    )

    expect(result.worldEvents[0].sourceNpcId).toBe('npc-verek-sorn')
  })

  it('tracks relatedNpcIds when provided', () => {
    const result = publishEvent(
      initialGameStateSnapshot,
      'coalition-formed',
      {},
      'system',
      { relatedNpcIds: ['npc-1', 'npc-2', 'npc-3'] }
    )

    expect(result.worldEvents[0].relatedNpcIds).toEqual(['npc-1', 'npc-2', 'npc-3'])
  })

  it('tracks relatedQuestIds when provided', () => {
    const result = publishEvent(
      initialGameStateSnapshot,
      'expedition-complete',
      {},
      'system',
      { relatedQuestIds: ['quest-test-1'] }
    )

    expect(result.worldEvents[0].relatedQuestIds).toEqual(['quest-test-1'])
  })

  it('caps worldEvents array at 100 events', () => {
    let state = initialGameStateSnapshot

    // Add 150 events
    for (let i = 0; i < 150; i++) {
      state = publishEvent(state, 'npc-hired', { index: i }, 'system')
    }

    expect(state.worldEvents).toHaveLength(100)
    // Most recent event should be first
    expect(state.worldEvents[0].payload).toEqual({ index: 149 })
    // Oldest retained event should be at position 99
    expect(state.worldEvents[99].payload).toEqual({ index: 50 })
  })

  it('adds activity log entry when message provided', () => {
    const result = publishEvent(
      initialGameStateSnapshot,
      'corridor-cleared',
      {},
      'system',
      {
        activityLogMessage: 'The corridor is open again!',
        activityLogCategory: 'economy',
      }
    )

    const logEntry = result.activityLog[result.activityLog.length - 1]
    expect(logEntry.message).toBe('The corridor is open again!')
    expect(logEntry.category).toBe('economy')
    expect(logEntry.day).toBe(initialGameStateSnapshot.day)
  })

  it('does not add activity log entry when no message provided', () => {
    const result = publishEvent(initialGameStateSnapshot, 'npc-hired', {}, 'npc')

    // Should not have added a new log entry
    expect(result.worldEvents).toHaveLength(1)
  })

  it('maintains correct day value for events', () => {
    const stateDay5 = { ...initialGameStateSnapshot, day: 5 }
    const stateDay10 = { ...initialGameStateSnapshot, day: 10 }

    const result1 = publishEvent(stateDay5, 'npc-departed', {}, 'npc')
    const result2 = publishEvent(stateDay10, 'npc-hired', {}, 'npc')

    expect(result1.worldEvents[0].day).toBe(5)
    expect(result2.worldEvents[0].day).toBe(10)
  })
})
