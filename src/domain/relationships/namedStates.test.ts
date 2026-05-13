/**
 * Tests for named relationship states (destiny-nno0).
 */

import { describe, it, expect } from 'vitest'
import {
  deriveRelationshipState,
  RELATIONSHIP_STATE_LABELS,
  RELATIONSHIP_STATE_BADGE,
} from './namedStates'
import type { RelationshipAxes } from './contracts'

function axes(overrides: Partial<RelationshipAxes>): RelationshipAxes {
  return { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0, ...overrides }
}

describe('deriveRelationshipState', () => {
  it('returns bonded for high trust + affinity + loyalty', () => {
    expect(deriveRelationshipState(axes({ trust: 75, affinity: 60, loyalty: 55 }))).toBe('bonded')
  })

  it('returns trusted for high trust alone', () => {
    expect(deriveRelationshipState(axes({ trust: 65, affinity: 20, loyalty: 10 }))).toBe('trusted')
  })

  it('returns dependent for high fear + low trust', () => {
    expect(deriveRelationshipState(axes({ fear: 70, trust: 10 }))).toBe('dependent')
  })

  it('returns rival for strongly negative affinity + low respect', () => {
    expect(deriveRelationshipState(axes({ affinity: -50, respect: -20, trust: 15, fear: 20 }))).toBe('rival')
  })

  it('returns hostile for very negative affinity', () => {
    expect(deriveRelationshipState(axes({ affinity: -60, trust: 30 }))).toBe('hostile')
  })

  it('returns tense for moderate negative affinity', () => {
    expect(deriveRelationshipState(axes({ affinity: -20, trust: 35 }))).toBe('tense')
  })

  it('returns estranged for low engagement across all axes', () => {
    expect(deriveRelationshipState(axes({ affinity: 5, trust: 10, fear: 5, loyalty: 5 }))).toBe('estranged')
  })

  it('returns estranged for default (zero) axes — zero engagement means disconnected', () => {
    expect(deriveRelationshipState(axes({}))).toBe('estranged')
  })

  it('returns neutral for moderate engagement that does not fit any named state', () => {
    // Some trust and affinity, but not enough for trusted/bonded; no negatives
    expect(deriveRelationshipState(axes({ trust: 30, affinity: 20, loyalty: 25 }))).toBe('neutral')
  })

  it('bonded takes priority over trusted', () => {
    // trust >= 70 + affinity >= 50 + loyalty >= 50 → bonded even though trust >= 60
    expect(deriveRelationshipState(axes({ trust: 80, affinity: 70, loyalty: 60 }))).toBe('bonded')
  })

  it('dependent takes priority over tense when fear is very high', () => {
    expect(deriveRelationshipState(axes({ fear: 65, trust: 20, affinity: -10 }))).toBe('dependent')
  })
})

describe('RELATIONSHIP_STATE_LABELS', () => {
  it('has a label for every state', () => {
    const states: string[] = ['bonded', 'trusted', 'dependent', 'rival', 'hostile', 'tense', 'estranged', 'neutral']
    states.forEach((s) => {
      expect(RELATIONSHIP_STATE_LABELS[s as keyof typeof RELATIONSHIP_STATE_LABELS]).toBeTruthy()
    })
  })
})

describe('RELATIONSHIP_STATE_BADGE', () => {
  it('bonded is green', () => {
    expect(RELATIONSHIP_STATE_BADGE.bonded).toBe('green')
  })

  it('hostile is red', () => {
    expect(RELATIONSHIP_STATE_BADGE.hostile).toBe('red')
  })

  it('estranged is grey', () => {
    expect(RELATIONSHIP_STATE_BADGE.estranged).toBe('grey')
  })
})
