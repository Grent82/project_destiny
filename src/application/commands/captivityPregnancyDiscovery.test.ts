import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { ensureCaptivityPregnancyDiscovery } from './captivityPregnancyDiscovery'
import { gameSliceReducer, gameActions } from '../store/gameSlice'

function makeState() {
  return {
    ...initialGameStateSnapshot,
    day: 14,
    pendingEvents: [],
    eventInstances: [],
    lastFiredDay: {},
  }
}

describe('ensureCaptivityPregnancyDiscovery', () => {
  it('queues a contextual authored event instance for unknown-context pregnancies', () => {
    const state = {
      ...makeState(),
      relationships: {
        ...makeState().relationships,
        'player→npc-marion-vale': {
          affinity: 0,
          respect: 0,
          fear: 0,
          trust: 72,
          loyalty: 0,
        },
      },
      roster: makeState().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              traits: { ...npc.traits, empathy: 72 },
              pregnancyState: { context: 'unknown' as const, daysElapsed: 0, questTag: null },
            }
          : npc,
      ),
    }

    const next = ensureCaptivityPregnancyDiscovery(state)

    expect(next.pendingEvents).toEqual([
      { eventId: 'event-captivity-pregnancy-discovery', firedOnDay: 14 },
    ])
    expect(next.eventInstances[0]?.sourceNpcId).toBe('npc-marion-vale')
    expect(next.eventInstances[0]?.presentationText).toContain('asks to speak in private')
    expect(next.eventInstances[0]?.presentationText).toContain('grieves ahead of herself')
    expect(next.lastFiredDay['captivity-pregnancy-discovery-npc-marion-vale']).toBe(14)
  })

  it('deduplicates per NPC once the discovery key has fired', () => {
    const state = {
      ...makeState(),
      roster: makeState().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              pregnancyState: { context: 'unknown' as const, daysElapsed: 0, questTag: null },
            }
          : npc,
      ),
      lastFiredDay: {
        'captivity-pregnancy-discovery-npc-marion-vale': 10,
      },
    }

    const next = ensureCaptivityPregnancyDiscovery(state)
    expect(next.pendingEvents).toHaveLength(0)
    expect(next.eventInstances).toHaveLength(0)
  })

  it('falls back to healer copy for distressed NPCs', () => {
    const state = {
      ...makeState(),
      roster: makeState().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              states: { ...npc.states, health: 50, stress: 81 },
              traits: { ...npc.traits, empathy: 20 },
              pregnancyState: { context: 'unknown' as const, daysElapsed: 0, questTag: null },
            }
          : npc,
      ),
    }

    const next = ensureCaptivityPregnancyDiscovery(state)
    expect(next.eventInstances[0]?.presentationText).toContain('house healer requests a private audience')
  })
})

describe('contextual event resolution', () => {
  it('resolves only one pending instance of a generic event at a time', () => {
    const state = {
      ...makeState(),
      pendingEvents: [
        { eventId: 'event-captivity-pregnancy-discovery', firedOnDay: 14 },
        { eventId: 'event-captivity-pregnancy-discovery', firedOnDay: 14 },
      ],
      eventInstances: [
        {
          instanceId: 'inst-1',
          eventId: 'event-captivity-pregnancy-discovery',
          firedOnDay: 14,
          resolvedOnDay: null,
          chosenOptionId: null,
          sourceDistrictId: null,
          sourceNpcId: 'npc-marion-vale',
          presentationText: 'First instance',
          contextId: null,
        },
        {
          instanceId: 'inst-2',
          eventId: 'event-captivity-pregnancy-discovery',
          firedOnDay: 14,
          resolvedOnDay: null,
          chosenOptionId: null,
          sourceDistrictId: null,
          sourceNpcId: 'npc-ida-rhys',
          presentationText: 'Second instance',
          contextId: null,
        },
      ],
    }

    const next = gameSliceReducer(
      state,
      gameActions.resolveEvent({
        eventId: 'event-captivity-pregnancy-discovery',
        choiceId: 'choice-protect',
      }),
    )

    expect(next.pendingEvents).toHaveLength(1)
    expect(next.eventInstances[0]?.resolvedOnDay).toBe(14)
    expect(next.eventInstances[0]?.chosenOptionId).toBe('choice-protect')
    expect(next.eventInstances[1]?.resolvedOnDay).toBeNull()
  })
})
