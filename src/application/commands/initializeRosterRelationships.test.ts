import { describe, expect, it } from 'vitest'
import { initializeRosterRelationships } from './initializeRosterRelationships'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

describe('initializeRosterRelationships', () => {
  it('returns state unchanged when roster has fewer than 2 members', () => {
    const state = { ...initialStateWithIda, roster: [initialStateWithIda.roster[0]!] }
    const result = initializeRosterRelationships(state, () => 0.5)
    expect(result).toBe(state)
  })

  it('creates both directed edges for each roster pair', () => {
    const result = initializeRosterRelationships(initialStateWithIda, () => 0.5)
    const [a, b] = [initialStateWithIda.roster[0]!, initialStateWithIda.roster[1]!]
    expect(result.relationships[buildRelationshipKey(a.npcId, b.npcId)]).toBeDefined()
    expect(result.relationships[buildRelationshipKey(b.npcId, a.npcId)]).toBeDefined()
  })

  it('seeds Tier 1 authored bond (Ida ↔ Holst) when both on roster', () => {
    const holstEntry = {
      ...initialStateWithIda.roster[0]!,
      npcId: 'npc-verek-holst',
      name: 'Verek Holst',
    }
    const state = {
      ...initialStateWithIda,
      roster: [
        { ...initialStateWithIda.roster[1]!, npcId: 'npc-ida-rhys' },
        holstEntry,
      ],
      relationships: {},
    }
    const result = initializeRosterRelationships(state, () => 0.5)
    const idaToHolst = result.relationships[buildRelationshipKey('npc-ida-rhys', 'npc-verek-holst')]
    expect(idaToHolst?.affinity).toBe(45)
    expect(idaToHolst?.trust).toBe(30)
  })

  it('does not overwrite an existing relationship', () => {
    const [a, b] = [initialStateWithIda.roster[0]!, initialStateWithIda.roster[1]!]
    const key = buildRelationshipKey(a.npcId, b.npcId)
    const existing = { affinity: 99, trust: 99, respect: 0, fear: 0, loyalty: 0 }
    const state = { ...initialStateWithIda, relationships: { [key]: existing } }
    const result = initializeRosterRelationships(state, () => 0.5)
    expect(result.relationships[key]).toEqual(existing)
  })

  it('sets affinity to a non-negative value for compatibility-derived pairs', () => {
    const result = initializeRosterRelationships(initialStateWithIda, () => 0.5)
    const [a, b] = [initialStateWithIda.roster[0]!, initialStateWithIda.roster[1]!]
    const edge = result.relationships[buildRelationshipKey(a.npcId, b.npcId)]
    expect(edge?.affinity).toBeGreaterThanOrEqual(0)
    expect(edge?.affinity).toBeLessThanOrEqual(70)
  })

  it('trust is set to floor(affinity * 0.5) for compatibility-derived pairs', () => {
    const result = initializeRosterRelationships(initialStateWithIda, () => 0.5)
    const [a, b] = [initialStateWithIda.roster[0]!, initialStateWithIda.roster[1]!]
    const edge = result.relationships[buildRelationshipKey(a.npcId, b.npcId)]!
    expect(edge.trust).toBe(Math.floor(edge.affinity * 0.5))
    expect(edge.respect).toBe(0)
    expect(edge.fear).toBe(0)
    expect(edge.loyalty).toBe(0)
  })

  it('is idempotent — calling twice produces same relationships', () => {
    const first = initializeRosterRelationships(initialStateWithIda, () => 0.5)
    const second = initializeRosterRelationships(first, () => 0.9)
    expect(second.relationships).toEqual(first.relationships)
  })

  it('uses rng to vary affinity across calls with different seeds', () => {
    const result1 = initializeRosterRelationships(initialStateWithIda, () => 0)
    const result2 = initializeRosterRelationships(initialStateWithIda, () => 1)
    const [a, b] = [initialStateWithIda.roster[0]!, initialStateWithIda.roster[1]!]
    const key = buildRelationshipKey(a.npcId, b.npcId)
    // rng=0 gives variance = round(0*13-5)=-5; rng=1 gives variance = round(1*13-5)=8
    expect(result1.relationships[key]?.affinity).not.toBe(result2.relationships[key]?.affinity)
  })
})
