import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { evaluateEvents } from './evaluateEvents'
import { applyOutcomes } from './applyEventOutcome'
import { contentCatalog } from '../content/contentCatalog'
import { gameSliceReducer, gameActions } from '../store/gameSlice'

// A minimal base state with known values for testing
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    pendingEvents: [],
    cityDials: { control: 50, prosperity: 50, unrest: 20, corruption: 20 },
    cityResources: {
      foodSecurity: 80,
      waterAccess: 80,
      materialStock: 80,
      corridorStatus: 'open',
    },
    factionStandings: {
      'faction-civic-compact': 10,
      'faction-gilded-court': 0,
      'faction-foundry-league': 0,
      'faction-tallow-ring': 10,
      'faction-the-restored': 0,
    },
    day: 10,
    money: 500,
    ...overrides,
  }
}

describe('evaluateEvents', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always fires (0 <= probability)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fires an event when conditions are met', () => {
    // event-unpaid-wages-unrest: minUnrest 60, probability 0.6
    const state = makeState({ cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 } })
    const next = evaluateEvents(state)
    const ids = next.pendingEvents.map((e) => e.eventId)
    expect(ids).toContain('event-unpaid-wages-unrest')
  })

  it('does not fire already-pending events', () => {
    const state = makeState({
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      pendingEvents: [{ eventId: 'event-unpaid-wages-unrest', firedOnDay: 9 }],
    })
    const next = evaluateEvents(state)
    const matches = next.pendingEvents.filter((e) => e.eventId === 'event-unpaid-wages-unrest')
    expect(matches).toHaveLength(1)
  })

  it('respects probability=0 — never fires', () => {
    // Mock random to return 0.5, which is > 0, so probability=0 should block
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    // Manually override events to a single template with probability=0
    const originalEvents = contentCatalog.events
    ;(contentCatalog as { events: typeof originalEvents }).events = [
      {
        id: 'test-never-fires',
        title: 'Never',
        description: 'Never fires',
        triggerConditions: { probability: 0 },
        choices: [{ id: 'c1', label: 'OK', outcomes: [] }],
        isAutoResolved: false,
        tags: [],
      },
    ]
    ;(contentCatalog as { eventsById: Map<string, unknown> }).eventsById = new Map(
      contentCatalog.events.map((e) => [e.id, e]),
    )

    const state = makeState()
    const next = evaluateEvents(state)
    expect(next.pendingEvents).toHaveLength(0)

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, unknown> }).eventsById = new Map(
      originalEvents.map((e) => [e.id, e]),
    )
  })
})

describe('applyOutcomes', () => {
  it('adjustFactionStanding applies delta and clamps', () => {
    const state = makeState({ factionStandings: { 'faction-civic-compact': 95 } })
    const next = applyOutcomes(state, [
      { type: 'adjustFactionStanding', target: 'faction-civic-compact', delta: 10 },
    ])
    expect(next.factionStandings['faction-civic-compact']).toBe(100)
  })

  it('adjustFactionStanding clamps at -100', () => {
    const state = makeState({ factionStandings: { 'faction-civic-compact': -98 } })
    const next = applyOutcomes(state, [
      { type: 'adjustFactionStanding', target: 'faction-civic-compact', delta: -10 },
    ])
    expect(next.factionStandings['faction-civic-compact']).toBe(-100)
  })

  it('addCredits adds money and floors at 0', () => {
    const state = makeState({ money: 20 })
    const next = applyOutcomes(state, [{ type: 'addCredits', delta: -50 }])
    expect(next.money).toBe(0)
  })

  it('addCredits increases money', () => {
    const state = makeState({ money: 100 })
    const next = applyOutcomes(state, [{ type: 'addCredits', delta: 50 }])
    expect(next.money).toBe(150)
  })

  it('adjustCityDial changes dial value', () => {
    const state = makeState({ cityDials: { control: 50, prosperity: 50, unrest: 50, corruption: 50 } })
    const next = applyOutcomes(state, [{ type: 'adjustCityDial', target: 'unrest', delta: -10 }])
    expect(next.cityDials.unrest).toBe(40)
  })

  it('adjustCityDial clamps at 0', () => {
    const state = makeState({ cityDials: { control: 50, prosperity: 50, unrest: 5, corruption: 50 } })
    const next = applyOutcomes(state, [{ type: 'adjustCityDial', target: 'unrest', delta: -20 }])
    expect(next.cityDials.unrest).toBe(0)
  })

  it('adjustCityResource changes a city resource value', () => {
    const state = makeState()
    const next = applyOutcomes(state, [{ type: 'adjustCityResource', target: 'foodSecurity', delta: -15 }])
    expect(next.cityResources.foodSecurity).toBe(65)
  })

  it('adjustCityResource clamps at 0', () => {
    const state = makeState({ cityResources: { foodSecurity: 5, waterAccess: 80, materialStock: 80, corridorStatus: 'open' } })
    const next = applyOutcomes(state, [{ type: 'adjustCityResource', target: 'foodSecurity', delta: -20 }])
    expect(next.cityResources.foodSecurity).toBe(0)
  })

  it('adjustCityResource clamps at 100', () => {
    const state = makeState({ cityResources: { foodSecurity: 95, waterAccess: 80, materialStock: 80, corridorStatus: 'open' } })
    const next = applyOutcomes(state, [{ type: 'adjustCityResource', target: 'foodSecurity', delta: 20 }])
    expect(next.cityResources.foodSecurity).toBe(100)
  })

  it('setCorridorStatus updates the corridor status', () => {
    const state = makeState()
    const next = applyOutcomes(state, [{ type: 'setCorridorStatus', value: 'blocked' }])
    expect(next.cityResources.corridorStatus).toBe('blocked')
  })

  it('addActivityLogEntry appends a log message', () => {
    const state = makeState()
    const next = applyOutcomes(state, [{ type: 'addActivityLogEntry', message: 'Something happened.' }])
    expect(next.activityLog[0]?.message).toBe('Something happened.')
    expect(next.activityLog[0]?.category).toBe('system')
  })
})

describe('resolveEvent reducer', () => {
  it('removes event from pendingEvents and applies outcomes', () => {
    const initialState = makeState({
      pendingEvents: [{ eventId: 'event-unpaid-wages-unrest', firedOnDay: 1 }],
      money: 500,
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
    })

    const next = gameSliceReducer(
      initialState,
      gameActions.resolveEvent({ eventId: 'event-unpaid-wages-unrest', choiceId: 'choice-pay-extra' }),
    )

    expect(next.pendingEvents.find((e) => e.eventId === 'event-unpaid-wages-unrest')).toBeUndefined()
    expect(next.money).toBe(450) // -50 Marks
    expect(next.cityDials.unrest).toBe(62) // -8
  })

  it('does nothing for unknown eventId', () => {
    const initialState = makeState({ pendingEvents: [] })
    const next = gameSliceReducer(
      initialState,
      gameActions.resolveEvent({ eventId: 'event-does-not-exist', choiceId: 'choice-foo' }),
    )
    expect(next).toEqual(initialState)
  })
})
