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
  intimacyStage?: 'none' | 'affinity' | 'attachment' | 'committed'
  bondType?: string
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
        respect: 0,
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
})
