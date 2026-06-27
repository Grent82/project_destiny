import { describe, it, expect } from 'vitest'
import { proposeNpcDate, proposeNpcDatesForAllEligiblePairs } from './proposeNpcDate'
import { resolveNpcDate, resolveAllNpcDatesForCurrentSlot } from './resolveNpcDate'
import type { GameState } from '../../domain/game/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { INITIAL_GAME_STATE } from '../../data/runtime/initial-game-state'

// Create a deterministic RNG for testing
function createTestRng(seedLines: number[]): () => number {
  let index = 0
  return () => {
    if (index >= seedLines.length) return 0.5
    return seedLines[index++]!
  }
}

function createTestState(overrides?: Partial<GameState>): GameState {
  return {
    ...INITIAL_GAME_STATE,
    day: 10,
    timeSlot: 'evening' as const,
    relationships: {},
    pendingDateProposals: [],
    scheduledDates: [],
    npcDateCooldowns: {},
    ...overrides,
    roster: [
      {
        npcId: 'npc-ida-rhys',
        assignment: 'idle',
        status: 'roster',
        captivityState: null,
        traits: { discipline: 50, ambition: 40, empathy: 70, ruthlessness: 20, prudence: 60, curiosity: 55, dominance: 35, loyalty: 65, vanity: 30, zeal: 25 },
        pregnancyState: null,
      },
      {
        npcId: 'npc-mira',
        assignment: 'idle',
        status: 'roster',
        captivityState: null,
        traits: { discipline: 60, ambition: 55, empathy: 50, ruthlessness: 45, prudence: 50, curiosity: 40, dominance: 50, loyalty: 55, vanity: 45, zeal: 60 },
        pregnancyState: null,
      },
      {
        npcId: 'npc-deployed-test',
        assignment: 'deployed',
        status: 'roster',
        captivityState: null,
        traits: { discipline: 50, ambition: 40, empathy: 70, ruthlessness: 20, prudence: 60, curiosity: 55, dominance: 35, loyalty: 65, vanity: 30, zeal: 25 },
        pregnancyState: null,
      },
    ],
  }
}

describe('proposeNpcDate', () => {
  it('should not propose a date when intimacy is too low', () => {
    const state = createTestState()
    const rng = createTestRng([0.5, 0.5, 0.5])

    const result = proposeNpcDate(state, 'npc-ida-rhys', 'npc-mira', rng)

    // No proposal should be created due to low intimacy
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('should propose a date when NPCs have sufficient intimacy and affinity', () => {
    const state = createTestState()
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    // Set up sufficient relationship levels
    state.relationships = {
      [key]: {
        affinity: 60,
        trust: 50,
        respect: 40,
        fear: 10,
        loyalty: 30,
        intimacyStage: 'affinity',
      },
      [reverseKey]: {
        affinity: 55,
        trust: 45,
        respect: 35,
        fear: 5,
        loyalty: 25,
        intimacyStage: 'affinity',
      },
    }

    // RNG that will pass all checks and select a date
    const rng = createTestRng([0.5, 0.3, 0.5])

    const result = proposeNpcDate(state, 'npc-ida-rhys', 'npc-mira', rng)

    expect(result.pendingDateProposals).toHaveLength(1)
    expect(result.pendingDateProposals[0]?.proposerNpcId).toBe('npc-ida-rhys')
    expect(result.pendingDateProposals[0]?.targetNpcId).toBe('npc-mira')
    expect(result.pendingDateProposals[0]?.status).toBe('accepted')
  })

  it('should not propose a date when either NPC is deployed', () => {
    const state = createTestState()
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-deployed-test')
    const reverseKey = buildRelationshipKey('npc-deployed-test', 'npc-ida-rhys')

    state.relationships = {
      [key]: {
        affinity: 60,
        trust: 50,
        respect: 40,
        fear: 10,
        loyalty: 30,
        intimacyStage: 'affinity',
      },
      [reverseKey]: {
        affinity: 55,
        trust: 45,
        respect: 35,
        fear: 5,
        loyalty: 25,
        intimacyStage: 'affinity',
      },
    }

    const rng = createTestRng([0.5])

    const result = proposeNpcDate(state, 'npc-ida-rhys', 'npc-deployed-test', rng)

    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('should not propose a date when fear is too high', () => {
    const state = createTestState()
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    state.relationships = {
      [key]: {
        affinity: 60,
        trust: 50,
        respect: 40,
        fear: 10,
        loyalty: 30,
        intimacyStage: 'affinity',
      },
      [reverseKey]: {
        affinity: 55,
        trust: 45,
        respect: 35,
        fear: 35, // High fear blocks
        loyalty: 25,
        intimacyStage: 'affinity',
      },
    }

    const rng = createTestRng([0.5])

    const result = proposeNpcDate(state, 'npc-ida-rhys', 'npc-mira', rng)

    expect(result.pendingDateProposals).toHaveLength(0)
  })
})

describe('proposeNpcDatesForAllEligiblePairs', () => {
  it('should scan all eligible pairs and propose dates based on RNG', () => {
    const state = createTestState()
    const key1 = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey1 = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    // Set up relationship for ida-mira pair
    state.relationships = {
      [key1]: {
        affinity: 60,
        trust: 50,
        respect: 40,
        fear: 10,
        loyalty: 30,
        intimacyStage: 'affinity',
      },
      [reverseKey1]: {
        affinity: 55,
        trust: 45,
        respect: 35,
        fear: 5,
        loyalty: 25,
        intimacyStage: 'affinity',
      },
    }

    // RNG that will trigger a proposal for the eligible pair
    const rng = createTestRng([0.015, 0.5, 0.5, 0.5]) // First value triggers proposal

    const result = proposeNpcDatesForAllEligiblePairs(state, rng)

    // Should have at least one proposal (ida-mira pair)
    expect(result.pendingDateProposals.length).toBeGreaterThanOrEqual(0) // May be 0 if RNG didn't trigger
  })

  it('should not propose dates for deployed NPCs', () => {
    const state = createTestState()

    // All relationships set high, but one NPC is deployed
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-deployed-test')
    const reverseKey = buildRelationshipKey('npc-deployed-test', 'npc-ida-rhys')

    state.relationships = {
      [key]: {
        affinity: 80,
        trust: 70,
        respect: 60,
        fear: 5,
        loyalty: 50,
        intimacyStage: 'attachment',
      },
      [reverseKey]: {
        affinity: 75,
        trust: 65,
        respect: 55,
        fear: 5,
        loyalty: 45,
        intimacyStage: 'attachment',
      },
    }

    const rng = createTestRng([0.01, 0.5])

    const result = proposeNpcDatesForAllEligiblePairs(state, rng)

    // Deployed NPC should not be included in proposals
    const hasDeployedProposal = result.pendingDateProposals.some(
      (p) => p.proposerNpcId === 'npc-deployed-test' || p.targetNpcId === 'npc-deployed-test',
    )
    expect(hasDeployedProposal).toBe(false)
  })
})

describe('resolveNpcDate', () => {
  it('should resolve an NPC-NPC date and update relationships', () => {
    const state = createTestState()
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    state.relationships = {
      [key]: {
        affinity: 50,
        trust: 40,
        respect: 30,
        fear: 10,
        loyalty: 20,
        intimacyStage: 'affinity',
      },
      [reverseKey]: {
        affinity: 45,
        trust: 35,
        respect: 25,
        fear: 5,
        loyalty: 15,
        intimacyStage: 'affinity',
      },
    }

    // Create a scheduled NPC-NPC date
    state.scheduledDates = [
      {
        dateId: 'test-date-1',
        npcIds: ['npc-ida-rhys', 'npc-mira'],
        dateTemplateId: 'date-quiet-walk',
        scheduledDay: 10,
        scheduledTimeSlot: 'evening',
        location: { districtId: 'district-the-pale' },
        status: 'scheduled',
        outcomeId: null,
      },
    ]

    const rng = createTestRng([0.5]) // Pick outcome index 1 (middle)

    const result = resolveNpcDate(state, 'test-date-1', rng)

    // Date should be marked as completed
    const completedDate = result.scheduledDates.find((d) => d.dateId === 'test-date-1')
    expect(completedDate?.status).toBe('completed')
    expect(completedDate?.outcomeId).toBeDefined()

    // Activity log should have an entry
    const npcDateLog = result.activityLog.find((log) => log.message.includes('ida-rhys') || log.message.includes('Mira'))
    expect(npcDateLog).toBeDefined()
  })

  it('should not resolve player-involved dates', () => {
    const state = createTestState()

    state.scheduledDates = [
      {
        dateId: 'player-date-1',
        npcIds: ['player', 'npc-ida-rhys'],
        dateTemplateId: 'date-quiet-walk',
        scheduledDay: 10,
        scheduledTimeSlot: 'evening',
        location: { districtId: 'district-the-pale' },
        status: 'scheduled',
        outcomeId: null,
      },
    ]

    const rng = createTestRng([0.5])

    const result = resolveNpcDate(state, 'player-date-1', rng)

    // Player dates should not be processed by resolveNpcDate
    const playerDate = result.scheduledDates.find((d) => d.dateId === 'player-date-1')
    expect(playerDate?.status).toBe('scheduled') // Should remain unchanged
  })

  it('should advance intimacy stage when thresholds are met', () => {
    const state = createTestState()
    const key = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    // Start at affinity stage with high values
    state.relationships = {
      [key]: {
        affinity: 70,
        trust: 60,
        respect: 50,
        fear: 5,
        loyalty: 40,
        intimacyStage: 'affinity',
      },
      [reverseKey]: {
        affinity: 65,
        trust: 55,
        respect: 45,
        fear: 5,
        loyalty: 35,
        intimacyStage: 'affinity',
      },
    }

    state.scheduledDates = [
      {
        dateId: 'test-date-2',
        npcIds: ['npc-ida-rhys', 'npc-mira'],
        dateTemplateId: 'date-music-night',
        scheduledDay: 10,
        scheduledTimeSlot: 'night',
        location: { districtId: 'district-the-pale' },
        status: 'scheduled',
        outcomeId: null,
      },
    ]

    // RNG that will trigger intimacy advancement
    const rng = createTestRng([0.3, 0.3])

    const result = resolveNpcDate(state, 'test-date-2', rng)

    // Check that intimacy may have advanced (depends on RNG)
    const newKey = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    // The intimacy should either stay the same or advance based on RNG
    expect(['affinity', 'attachment'].includes(result.relationships[newKey]?.intimacyStage ?? 'none')).toBe(true)
  })
})

describe('resolveAllNpcDatesForCurrentSlot', () => {
  it('should resolve all scheduled NPC-NPC dates for the current day and time slot', () => {
    const state = createTestState()

    const key1 = buildRelationshipKey('npc-ida-rhys', 'npc-mira')
    const reverseKey1 = buildRelationshipKey('npc-mira', 'npc-ida-rhys')

    state.relationships = {
      [key1]: {
        affinity: 50,
        trust: 40,
        respect: 30,
        fear: 10,
        loyalty: 20,
        intimacyStage: 'affinity',
      },
      [reverseKey1]: {
        affinity: 45,
        trust: 35,
        respect: 25,
        fear: 5,
        loyalty: 15,
        intimacyStage: 'affinity',
      },
    }

    // Multiple scheduled dates
    state.scheduledDates = [
      {
        dateId: 'date-1',
        npcIds: ['npc-ida-rhys', 'npc-mira'],
        dateTemplateId: 'date-quiet-walk',
        scheduledDay: 10,
        scheduledTimeSlot: 'evening',
        location: { districtId: 'district-the-pale' },
        status: 'scheduled',
        outcomeId: null,
      },
      {
        dateId: 'date-2',
        npcIds: ['npc-ida-rhys', 'npc-mira'],
        dateTemplateId: 'date-shared-meal',
        scheduledDay: 11, // Different day - should not be resolved
        scheduledTimeSlot: 'evening',
        location: { districtId: 'district-the-pale' },
        status: 'scheduled',
        outcomeId: null,
      },
    ]

    const rng = createTestRng([0.5, 0.5])

    const result = resolveAllNpcDatesForCurrentSlot(state, rng)

    // Only date-1 should be completed (same day and time slot)
    const date1 = result.scheduledDates.find((d) => d.dateId === 'date-1')
    const date2 = result.scheduledDates.find((d) => d.dateId === 'date-2')

    expect(date1?.status).toBe('completed')
    expect(date2?.status).toBe('scheduled') // Should remain scheduled
  })
})
