import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { publishEvent } from '../commands/events/publishEvent'
import {
  selectWorldEvents,
  selectWorldEventsByType,
  selectRecentWorldEvents,
  selectEventsByNpcId,
  selectEventsByDay,
  selectCoalitionEvents,
  selectCorridorEvents,
  selectExpeditionEvents,
} from './worldEvents'

describe('worldEvents selectors', () => {
  const setup = () => {
    let state = initialGameStateSnapshot

    // Create a variety of events for testing
    state = publishEvent(state, 'corridor-blocked', { severity: 80 }, 'system')
    state = publishEvent(state, 'npc-hired', {}, 'player', { sourceNpcId: 'npc-verek-sorn' })
    state = publishEvent(state, 'expedition-started', {}, 'npc', {
      sourceNpcId: 'npc-verek-sorn',
      relatedNpcIds: ['npc-1', 'npc-2'],
      relatedQuestIds: ['quest-test'],
    })
    state = publishEvent(state, 'coalition-formed', {}, 'system', {
      relatedNpcIds: ['npc-1', 'npc-2', 'npc-3'],
    })
    state = publishEvent(state, 'corridor-cleared', {}, 'system')

    return state
  }

  describe('selectWorldEvents', () => {
    it('returns all world events', () => {
      const state = setup()
      const events = selectWorldEvents({ game: state })

      expect(events).toHaveLength(5)
    })

    it('returns events in reverse chronological order (most recent first)', () => {
      const state = setup()
      const events = selectWorldEvents({ game: state })

      expect(events[0].type).toBe('corridor-cleared')
      expect(events[4].type).toBe('corridor-blocked')
    })
  })

  describe('selectWorldEventsByType', () => {
    it('filters events by type', () => {
      const state = setup()
      const selector = selectWorldEventsByType('corridor-blocked')
      const events = selector({ game: state })

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('corridor-blocked')
    })

    it('returns empty array when no events match type', () => {
      const state = setup()
      const selector = selectWorldEventsByType('shop-stock-low')
      const events = selector({ game: state })

      expect(events).toHaveLength(0)
    })
  })

  describe('selectRecentWorldEvents', () => {
    it('returns the most recent N events', () => {
      const state = setup()
      const selector = selectRecentWorldEvents(3)
      const events = selector({ game: state })

      expect(events).toHaveLength(3)
      expect(events[0].type).toBe('corridor-cleared')
      expect(events[2].type).toBe('expedition-started')
    })

    it('returns all events when limit exceeds count', () => {
      const state = setup()
      const selector = selectRecentWorldEvents(100)
      const events = selector({ game: state })

      expect(events).toHaveLength(5)
    })
  })

  describe('selectEventsByNpcId', () => {
    it('returns events where NPC is source', () => {
      const state = setup()
      const selector = selectEventsByNpcId('npc-verek-sorn')
      const events = selector({ game: state })

      expect(events).toHaveLength(2)
      expect(events.every((e: { sourceNpcId: string | null }) => e.sourceNpcId === 'npc-verek-sorn')).toBe(true)
    })

    it('returns events where NPC is a participant', () => {
      const state = setup()
      const selector = selectEventsByNpcId('npc-1')
      const events = selector({ game: state })

      expect(events).toHaveLength(2)
      expect(events.every((e: { relatedNpcIds: string[] }) => e.relatedNpcIds.includes('npc-1'))).toBe(true)
    })

    it('returns empty array when NPC not involved in any events', () => {
      const state = setup()
      const selector = selectEventsByNpcId('npc-nonexistent')
      const events = selector({ game: state })

      expect(events).toHaveLength(0)
    })
  })

  describe('selectEventsByDay', () => {
    it('returns events from the specified day', () => {
      const stateDay5 = { ...initialGameStateSnapshot, day: 5 }
      const stateDay10 = { ...initialGameStateSnapshot, day: 10 }

      const resultDay5 = publishEvent(stateDay5, 'npc-hired', {}, 'system')
      publishEvent(stateDay10, 'npc-hired', {}, 'system')

      const selector = selectEventsByDay(5)
      const events = selector({ game: resultDay5 })

      expect(events).toHaveLength(1)
      expect(events[0].day).toBe(5)
    })
  })

  describe('selectCoalitionEvents', () => {
    it('returns coalition-formed and coalition-dissolved events', () => {
      const state = setup()
      const events = selectCoalitionEvents({ game: state })

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('coalition-formed')
    })
  })

  describe('selectCorridorEvents', () => {
    it('returns all corridor-related events', () => {
      const state = setup()
      const events = selectCorridorEvents({ game: state })

      expect(events).toHaveLength(2)
      const types = events.map((e: { type: string }) => e.type)
      expect(types).toContain('corridor-blocked')
      expect(types).toContain('corridor-cleared')
    })
  })

  describe('selectExpeditionEvents', () => {
    it('returns all expedition-related events', () => {
      const state = setup()
      const events = selectExpeditionEvents({ game: state })

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('expedition-started')
    })
  })
})
