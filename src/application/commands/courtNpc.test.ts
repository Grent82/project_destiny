import { describe, expect, it } from 'vitest'

import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'
import { courtNpc } from './courtNpc'
import { initialStateWithIda } from './testFixtures'

const NPC_ID = 'npc-ida-rhys'
const PLAYER_ID = 'player'

function stateWithRelationship(overrides: {
  trust?: number
  affinity?: number
  fear?: number
  loyalty?: number
  respect?: number
  intimacyStage?: 'none' | 'affinity' | 'attachment' | 'committed'
  bondType?: string
  assignment?: 'idle' | 'deployed' | 'working'
  captivityStatus?: 'captive' | 'missing' | null
  status?: 'mercenary' | 'ward'
}): GameState {
  const playerToNpc = buildRelationshipKey(PLAYER_ID, NPC_ID)
  const npcToPlayer = buildRelationshipKey(NPC_ID, PLAYER_ID)
  return {
    ...initialStateWithIda,
    relationships: {
      ...initialStateWithIda.relationships,
      [playerToNpc]: {
        affinity: overrides.affinity ?? 0,
        trust: overrides.trust ?? 0,
        fear: overrides.fear ?? 0,
        respect: overrides.respect ?? 0,
        loyalty: 0,
        intimacyStage: overrides.intimacyStage,
        bondType: overrides.bondType,
      },
      [npcToPlayer]: {
        affinity: 0,
        trust: 0,
        fear: 0,
        respect: 0,
        loyalty: overrides.loyalty ?? 0,
        intimacyStage: overrides.intimacyStage,
        bondType: overrides.bondType,
      },
    },
    lastFiredDay: {},
    roster: [
      {
        ...initialStateWithIda.roster[1]!,
        assignment: overrides.assignment ?? 'idle',
        status: overrides.status ?? 'mercenary',
        captivityState: overrides.captivityStatus
          ? {
              status: overrides.captivityStatus,
              holderId: null,
              siteId: null,
              roomId: null,
              regime: 'unknown',
              condition: 'healthy',
              compliance: 'resistant',
              bondType: 'none',
              timeHeldDays: 0,
              lastTransferDay: null,
              questTag: null,
            }
          : undefined,
      },
    ],
  }
}

describe('courtNpc', () => {
  it('adds a visible courtship action log and improves relationship state', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10 })

    const result = courtNpc(state, NPC_ID)

    expect(result.activityLog[0]?.id.startsWith(`courtship::${NPC_ID}::`)).toBe(true)
    expect(result.activityLog[0]?.message).toMatch(/You make time to court Ida Rhys/i)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.trust).toBeGreaterThan(28)
    expect(edge.affinity).toBeGreaterThan(18)
  })

  it('can advance the romance arc through explicit courtship instead of passive drift', () => {
    const state = stateWithRelationship({ trust: 29, affinity: 19, fear: 10 })

    const result = courtNpc(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(edge.bondType).toBe('romantic')
  })

  it('does not allow repeated courtship with the same NPC on the same day', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10 })

    const once = courtNpc(state, NPC_ID)
    const twice = courtNpc(once, NPC_ID)

    const matchingEntries = twice.activityLog.filter((entry) => entry.id.startsWith(`courtship::${NPC_ID}::`))
    expect(matchingEntries).toHaveLength(1)
    expect(twice).toBe(once)
  })

  it('applies 50% gain reduction for deployed NPCs', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10, assignment: 'deployed' })

    const result = courtNpc(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Deployment reduces gains: trust +2 (was +4), affinity +2 (was +4)
    expect(edge.trust).toBe(30) // 28 + 2
    expect(edge.affinity).toBe(20) // 18 + 2
    expect(result.activityLog[0]?.message).toMatch(/on deployment/)
  })

  it('applies 50% gain reduction for negative respect (< -30)', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10, respect: -35 })

    const result = courtNpc(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Negative respect reduces gains: trust +2 (was +4), affinity +2 (was +4)
    expect(edge.trust).toBe(30) // 28 + 2
    expect(edge.affinity).toBe(20) // 18 + 2
    expect(result.activityLog[0]?.message).toMatch(/strained relationship/)
  })

  it('adds context tag for captive NPCs', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10, captivityStatus: 'captive' })

    const result = courtNpc(state, NPC_ID)

    expect(result.activityLog[0]?.message).toMatch(/in captivity/)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity') // Still progresses!
  })

  it('adds context tag for ward NPCs', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10, status: 'ward' })

    const result = courtNpc(state, NPC_ID)

    expect(result.activityLog[0]?.message).toMatch(/young/)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity') // Still progresses!
  })

  it('allows courtship for ward NPCs (no longer blocked)', () => {
    const state = stateWithRelationship({ trust: 29, affinity: 19, fear: 10, status: 'ward' })

    const result = courtNpc(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/young/)
  })

  it('allows courtship for captive NPCs (no longer blocked)', () => {
    const state = stateWithRelationship({ trust: 29, affinity: 19, fear: 10, captivityStatus: 'captive' })

    const result = courtNpc(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/in captivity/)
  })

  it('returns state unchanged when not at house', () => {
    const state = stateWithRelationship({ trust: 28, affinity: 18, fear: 10 })
    const awayState = { ...state, currentDistrictId: 'district-tangle' }

    const result = courtNpc(awayState, NPC_ID)

    expect(result.activityLog).toEqual(state.activityLog)
  })
})
