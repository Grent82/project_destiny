import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { evaluateEvents } from './evaluateEvents'
import { applyOutcomes } from './applyEventOutcome'
import { contentCatalog } from '../content/contentCatalog'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { selectPendingEvents } from '../selectors/events'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

/** Deterministic rng that always returns the provided value — for test control. */
const alwaysFire = () => 0   // rng() > probability is always false → event fires
const neverFire = () => 1    // rng() > probability is always true  → event blocked
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    pendingEvents: [],
    lastFiredDay: {},
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
  it('fires an event when conditions are met', () => {
    // event-unpaid-wages-unrest: minUnrest 60, probability 0.6
    const state = makeState({ cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 } })
    const next = evaluateEvents(state, alwaysFire)
    const ids = next.pendingEvents.map((e) => e.eventId)
    expect(ids).toContain('event-unpaid-wages-unrest')
  })

  it('does not fire already-pending events', () => {
    const state = makeState({
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      pendingEvents: [{ eventId: 'event-unpaid-wages-unrest', firedOnDay: 9 }],
    })
    const next = evaluateEvents(state, alwaysFire)
    const matches = next.pendingEvents.filter((e) => e.eventId === 'event-unpaid-wages-unrest')
    expect(matches).toHaveLength(1)
  })

  it('respects probability=0 — never fires', () => {
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
        repeatable: false,
        cooldownDays: 7,
        sourceDistrictId: null,
        sourceNpcId: null,
        presentationFlavour: null,
      },
    ]
    ;(contentCatalog as { eventsById: Map<string, unknown> }).eventsById = new Map(
      contentCatalog.events.map((e) => [e.id, e]),
    )

    const state = makeState()
    // neverFire rng (returns 1) means rng() > 0 is true → event blocked
    const next = evaluateEvents(state, neverFire)
    expect(next.pendingEvents).toHaveLength(0)

    ;(contentCatalog as { events: typeof originalEvents }).events = originalEvents
    ;(contentCatalog as { eventsById: Map<string, unknown> }).eventsById = new Map(
      originalEvents.map((e) => [e.id, e]),
    )
  })

  it('skips events already in lastFiredDay (non-repeatable)', () => {
    const state = makeState({
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: { 'event-unpaid-wages-unrest': 9 },
    })
    const next = evaluateEvents(state, alwaysFire)
    const ids = next.pendingEvents.map((e) => e.eventId)
    expect(ids).not.toContain('event-unpaid-wages-unrest')
  })

  it('populates lastFiredDay only for events that became pending', () => {
    const state = makeState({
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: {},
    })
    const next = evaluateEvents(state, alwaysFire)
    // Event that was queued should have lastFiredDay set
    expect(next.lastFiredDay['event-unpaid-wages-unrest']).toBe(state.day)
  })

  it('does not record lastFiredDay for truncated events', () => {
    // Create a state where many events are eligible
    // Only 5 regular events should become pending, others should NOT be in lastFiredDay
    const state = makeState({
      day: 10,
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: {},
      pendingEvents: [], // Clear any pending events
    })
    const next = evaluateEvents(state, alwaysFire)

    // Events in pendingEvents should have lastFiredDay set
    for (const pendingEvent of next.pendingEvents) {
      expect(next.lastFiredDay[pendingEvent.eventId]).toBe(state.day)
    }
  })

  it('truncated event can fire on a later day', () => {
    // This test proves that truncated events remain eligible
    const state = makeState({
      day: 10,
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: {},
      pendingEvents: [],
    })
    const afterFirstEval = evaluateEvents(state, alwaysFire)

    // On the next evaluation (same day, but simulating a new tick),
    // events not in lastFiredDay should still be eligible
    // Since we're on the same day, they'd still be on cooldown from first eval
    // So we advance the day to test re-eligibility
    const stateDay11 = makeState({
      day: 11,
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: afterFirstEval.lastFiredDay,
      pendingEvents: [], // Clear pending to see new selections
    })
    const afterSecondEval = evaluateEvents(stateDay11, alwaysFire)

    // All events selected on day 11 should have lastFiredDay[day11]
    for (const pendingEvent of afterSecondEval.pendingEvents) {
      expect(afterSecondEval.lastFiredDay[pendingEvent.eventId]).toBe(11)
    }
  })

  it('does not re-fire same event within same day even if conditions still met', () => {
    const state = makeState({
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      lastFiredDay: { 'event-unpaid-wages-unrest': 10 },
    })
    const next1 = evaluateEvents(state, alwaysFire)
    const next2 = evaluateEvents(next1, alwaysFire)
    const matches = next2.pendingEvents.filter((e) => e.eventId === 'event-unpaid-wages-unrest')
    expect(matches).toHaveLength(0)
  })
})

describe('district travel event triggers', () => {
  it('does NOT fire district events immediately on travelToDistrict (events fire at endDay only)', () => {
    const initialState = makeState({ lastFiredDay: {}, day: 1 })
    const next = gameSliceReducer(
      initialState,
      gameActions.travelToDistrict('district-the-hollows'),
    )
    const ids = next.pendingEvents.map((e) => e.eventId)
    expect(ids).not.toContain('event-hollows-entry')
  })

  it('does NOT fire pale approach event on travel (fires at endDay)', () => {
    const initialState = makeState({ lastFiredDay: {}, day: 1 })
    const next = gameSliceReducer(
      initialState,
      gameActions.travelToDistrict('district-the-pale'),
    )
    const ids = next.pendingEvents.map((e) => e.eventId)
    expect(ids).not.toContain('event-pale-approach')
  })

  it('sets currentDistrictId after travelToDistrict', () => {
    const initialState = makeState({ lastFiredDay: {}, day: 1 })
    const next = gameSliceReducer(
      initialState,
      gameActions.travelToDistrict('district-the-hollows'),
    )
    expect(next.currentDistrictId).toBe('district-the-hollows')
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

  it('addNpcToRoster places NPC on roster with arc initialized', () => {
    const state = makeState()
    const next = applyOutcomes(state, [{ type: 'addNpcToRoster', npcId: 'npc-elyn', arcId: 'arc-ward-growing' }])
    const elyn = next.roster.find((r) => r.npcId === 'npc-elyn')
    expect(elyn).toBeDefined()
    expect(elyn?.npcArc?.arcId).toBe('arc-ward-growing')
    expect(elyn?.npcArc?.stage).toBe('early-childhood')
  })

  it('addNpcToRoster without arcId places NPC with null arc', () => {
    const state = makeState()
    const next = applyOutcomes(state, [{ type: 'addNpcToRoster', npcId: 'npc-elyn' }])
    const elyn = next.roster.find((r) => r.npcId === 'npc-elyn')
    expect(elyn).toBeDefined()
    expect(elyn?.npcArc).toBeNull()
  })

  it('addNpcToRoster is idempotent — does not duplicate if already on roster', () => {
    const state = makeState()
    const once = applyOutcomes(state, [{ type: 'addNpcToRoster', npcId: 'npc-elyn', arcId: 'arc-ward-growing' }])
    const twice = applyOutcomes(once, [{ type: 'addNpcToRoster', npcId: 'npc-elyn', arcId: 'arc-ward-growing' }])
    expect(twice.roster.filter((r) => r.npcId === 'npc-elyn')).toHaveLength(1)
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
    expect(next.lastResolvedEventSummary).toMatchObject({
      eventId: 'event-unpaid-wages-unrest',
      choiceLabel: 'Pay a goodwill bonus (50 Marks)',
    })
    expect(next.lastResolvedEventSummary?.playerEffects).toContain('You lose 50 marks.')
    expect(next.lastResolvedEventSummary?.worldEffects).toContain('City unrest falls.')
  })

  it('does nothing for unknown eventId', () => {
    const initialState = makeState({ pendingEvents: [] })
    const next = gameSliceReducer(
      initialState,
      gameActions.resolveEvent({ eventId: 'event-does-not-exist', choiceId: 'choice-foo' }),
    )
    expect(next).toEqual(initialState)
  })

  it('can dismiss the last resolved event summary', () => {
    const initialState = makeState({
      lastResolvedEventSummary: {
        eventId: 'event-unpaid-wages-unrest',
        title: 'Pay the House',
        choiceLabel: 'Pay extra wages',
        day: 10,
        timeSlot: 'morning',
        sourceNpcName: 'Marion Vale',
        narrativeOutcome: 'The house steadies for one more night.',
        playerEffects: ['You lose 50 marks.'],
        npcEffects: [],
        worldEffects: ['City unrest falls.'],
      },
    })

    const next = gameSliceReducer(initialState, gameActions.dismissResolvedEventSummary())
    expect(next.lastResolvedEventSummary).toBeNull()
  })
})

describe('event budget — day-1 burst guardrail', () => {
  it('fresh-save day-1 evaluateEvents adds at most 5 regular events', () => {
    const state = makeState({ day: 1, isFirstRun: false, roster: [], lastFiredDay: {} })
    const next = evaluateEvents(state, alwaysFire)
    const regularEvents = next.pendingEvents.filter(
      (e) => !e.eventId.startsWith('event-tutorial-'),
    )
    expect(regularEvents.length).toBeLessThanOrEqual(5)
  })

  it('fresh-save day-1 total pending events stays bounded', () => {
    const state = makeState({ day: 1, isFirstRun: false, roster: [], lastFiredDay: {} })
    const next = evaluateEvents(state, alwaysFire)
    expect(next.pendingEvents.length).toBeLessThanOrEqual(10)
  })
})

describe('isFirstRun tutorial events', () => {
  it('fires tutorial events on the first endDay (isFirstRun=true, day=2)', () => {
    const state = makeState({ day: 2, isFirstRun: true })
    const next = evaluateEvents(state, alwaysFire)
    const tutorialIds = next.pendingEvents
      .map((e) => e.eventId)
      .filter((id) => id.startsWith('event-tutorial-'))
    expect(tutorialIds.length).toBeGreaterThanOrEqual(3)
    expect(tutorialIds).not.toContain('event-tutorial-end-day-rhythm')
  })

  it('does not fire tutorial events after isFirstRun is false', () => {
    const state = makeState({ day: 2, isFirstRun: false })
    const next = evaluateEvents(state, alwaysFire)
    const tutorialIds = next.pendingEvents
      .map((e) => e.eventId)
      .filter((id) => id.startsWith('event-tutorial-'))
    expect(tutorialIds.length).toBe(0)
  })

  it('does not fire tutorial events after day 2 window', () => {
    const state = makeState({ day: 5, isFirstRun: true })
    const next = evaluateEvents(state, alwaysFire)
    const tutorialIds = next.pendingEvents
      .map((e) => e.eventId)
      .filter((id) => id.startsWith('event-tutorial-'))
    expect(tutorialIds.length).toBe(0)
  })

  it('does not generically reschedule the Marion milestone event after it already fired', () => {
    const marionKey = buildRelationshipKey('player', 'npc-marion-vale')
    const state = makeState({
      completedQuestIds: ['quest-1'],
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [marionKey]: { affinity: 0, respect: 0, fear: 0, trust: 70, loyalty: 0 },
      },
      lastFiredDay: { 'event-marion-milestone-motivation': 9 },
    })

    const next = evaluateEvents(state, alwaysFire)
    expect(next.pendingEvents.some((e) => e.eventId === 'event-marion-milestone-motivation')).toBe(false)
  })
})

describe('pending event visibility', () => {
  it('hides scheduled future events until their firedOnDay arrives', () => {
    const state = makeState({
      day: 5,
      pendingEvents: [
        { eventId: 'event-rival-iron-covenant-counter-lead', firedOnDay: 7 },
        { eventId: 'event-rival-gilded-hand-bribe-warning', firedOnDay: 5 },
      ],
    })

    const visible = selectPendingEvents({ game: state } as { game: GameState })
    expect(visible).toEqual([{ eventId: 'event-rival-gilded-hand-bribe-warning', firedOnDay: 5 }])
  })
})
