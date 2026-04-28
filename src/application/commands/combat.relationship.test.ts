import { describe, it, expect } from 'vitest'

import { getRelationshipCombatModifier } from './combat'

describe('getRelationshipCombatModifier', () => {
  it('returns positive modifier for high loyalty+trust', () => {
    const rels = {
      'player-npc-1': { loyalty: 90, trust: 90, fear: 20, affinity: 50, respect: 50 }
    }
    const mod = getRelationshipCombatModifier('npc-1', rels)
    expect(mod).toBeGreaterThan(0)
  })

  it('returns negative modifier when fear is very high', () => {
    const rels = {
      'player-npc-1': { loyalty: 50, trust: 50, fear: 90, affinity: 50, respect: 50 }
    }
    const mod = getRelationshipCombatModifier('npc-1', rels)
    expect(mod).toBeLessThan(0)
  })

  it('returns 0 when no relationship exists', () => {
    const mod = getRelationshipCombatModifier('npc-unknown', {})
    expect(mod).toBe(0)
  })

  it('clamps modifier to [-0.15, +0.15]', () => {
    const rels = {
      'player-npc-2': { loyalty: 100, trust: 100, fear: 0, affinity: 100, respect: 100 }
    }
    const mod = getRelationshipCombatModifier('npc-2', rels)
    expect(mod).toBeLessThanOrEqual(0.15)
    expect(mod).toBeGreaterThanOrEqual(-0.15)
  })

  it('returns 0 for neutral relationship (50/50)', () => {
    const rels = {
      'player-npc-3': { loyalty: 50, trust: 50, fear: 0, affinity: 50, respect: 50 }
    }
    const mod = getRelationshipCombatModifier('npc-3', rels)
    expect(mod).toBe(0)
  })
})
