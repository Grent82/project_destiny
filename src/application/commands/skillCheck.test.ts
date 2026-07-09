import { describe, expect, it } from 'vitest'
import { computeSkillCheckBreakdown, performSkillCheck, rollSkillCheck } from './skillCheck'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain'

const BASE_STATE: GameState = initialGameStateSnapshot

describe('computeSkillCheckBreakdown (destiny-p8sb)', () => {
  it('returns just the base skill value when no bonuses are active', () => {
    const breakdown = computeSkillCheckBreakdown(BASE_STATE, 'negotiation')
    expect(breakdown.base).toBe(15)
    expect(breakdown.toolBonus).toBe(0)
    expect(breakdown.trainingBonus).toBe(0)
    expect(breakdown.attributeBonus).toBe(0)
    expect(breakdown.total).toBe(15)
  })

  it('adds an equipped tool bonus for the matching skill', () => {
    const state: GameState = {
      ...BASE_STATE,
      equippedTools: [{ itemId: 'item-lockpick-ringcut', skill: 'security', value: 15 }],
    }
    const breakdown = computeSkillCheckBreakdown(state, 'security')
    expect(breakdown.toolBonus).toBe(15)
    expect(breakdown.toolItemId).toBe('item-lockpick-ringcut')
    expect(breakdown.total).toBe(15 + 15)
  })

  it('ignores an equipped tool bonus for a different skill', () => {
    const state: GameState = {
      ...BASE_STATE,
      equippedTools: [{ itemId: 'item-lockpick-ringcut', skill: 'security', value: 15 }],
    }
    const breakdown = computeSkillCheckBreakdown(state, 'melee')
    expect(breakdown.toolBonus).toBe(0)
    expect(breakdown.total).toBe(15)
  })

  it('adds an active training bonus for the matching skill', () => {
    const state: GameState = {
      ...BASE_STATE,
      activeTrainingBonuses: [{ skill: 'academics', value: 10, source: 'item-training-manual' }],
    }
    const breakdown = computeSkillCheckBreakdown(state, 'academics')
    expect(breakdown.trainingBonus).toBe(10)
    expect(breakdown.trainingSource).toBe('item-training-manual')
    expect(breakdown.total).toBe(15 + 10)
  })

  it('adds half of an active temp attribute boost when it governs the checked skill', () => {
    // 'melee' is governed by 'might' -- confirms the destiny-p8sb attribute->skill mapping.
    const state: GameState = {
      ...BASE_STATE,
      day: 5,
      tempStatBoosts: [{ stat: 'might', value: 8, expiresDay: 10 }],
    }
    const breakdown = computeSkillCheckBreakdown(state, 'melee')
    expect(breakdown.governingAttribute).toBe('might')
    expect(breakdown.attributeBonus).toBe(4) // round(8 * 0.5)
    expect(breakdown.total).toBe(15 + 4)
  })

  it('ignores a temp attribute boost for an attribute that does not govern the checked skill', () => {
    const state: GameState = {
      ...BASE_STATE,
      day: 5,
      tempStatBoosts: [{ stat: 'presence', value: 20, expiresDay: 10 }], // governs negotiation/performance, not melee
    }
    const breakdown = computeSkillCheckBreakdown(state, 'melee')
    expect(breakdown.attributeBonus).toBe(0)
  })

  it('ignores an expired temp attribute boost', () => {
    const state: GameState = {
      ...BASE_STATE,
      day: 12,
      tempStatBoosts: [{ stat: 'might', value: 8, expiresDay: 10 }], // expiresDay <= day => expired
    }
    const breakdown = computeSkillCheckBreakdown(state, 'melee')
    expect(breakdown.attributeBonus).toBe(0)
  })

  it('stacks all three bonus sources together', () => {
    const state: GameState = {
      ...BASE_STATE,
      day: 5,
      equippedTools: [{ itemId: 'item-lockpick-ringcut', skill: 'security', value: 15 }],
      activeTrainingBonuses: [{ skill: 'security', value: 10, source: 'item-training-manual' }],
      tempStatBoosts: [{ stat: 'perception', value: 20, expiresDay: 10 }], // governs security/intrigue
    }
    const breakdown = computeSkillCheckBreakdown(state, 'security')
    expect(breakdown.base).toBe(15)
    expect(breakdown.toolBonus).toBe(15)
    expect(breakdown.trainingBonus).toBe(10)
    expect(breakdown.attributeBonus).toBe(10) // round(20 * 0.5)
    expect(breakdown.total).toBe(15 + 15 + 10 + 10)
  })

  it('clamps the total to 100', () => {
    const state: GameState = {
      ...BASE_STATE,
      equippedTools: [{ itemId: 'item-x', skill: 'melee', value: 90 }],
    }
    const breakdown = computeSkillCheckBreakdown(state, 'melee')
    expect(breakdown.total).toBe(100)
  })
})

describe('performSkillCheck (destiny-p8sb)', () => {
  it('succeeds when the roll is below the computed chance and logs the outcome with bonuses named', () => {
    const state: GameState = {
      ...BASE_STATE,
      equippedTools: [{ itemId: 'item-lockpick-ringcut', skill: 'security', value: 15 }],
    }
    const { result, nextState } = performSkillCheck(state, 'security', () => 0.01, { difficulty: 20 })
    expect(result.success).toBe(true)
    expect(nextState.activityLog[0]?.category).toBe('system')
    expect(nextState.activityLog[0]?.message).toContain('succeeded')
    expect(nextState.activityLog[0]?.message).toContain('tool +15')
  })

  it('fails when the roll is above the computed chance', () => {
    const { result, nextState } = performSkillCheck(BASE_STATE, 'melee', () => 0.99, { difficulty: 50 })
    expect(result.success).toBe(false)
    expect(nextState.activityLog[0]?.message).toContain('failed')
  })

  it('omits the bonus parenthetical when no bonuses are active', () => {
    const { nextState } = performSkillCheck(BASE_STATE, 'melee', () => 0.01, { difficulty: 20 })
    expect(nextState.activityLog[0]?.message).not.toContain('(')
  })

  it('uses a custom label when provided', () => {
    const { nextState } = performSkillCheck(BASE_STATE, 'intrigue', () => 0.01, { difficulty: 20, label: 'Read the ledger' })
    expect(nextState.activityLog[0]?.message).toContain('Read the ledger:')
  })

  it('clamps chance to a 5% floor even at extreme difficulty', () => {
    const { result } = performSkillCheck(BASE_STATE, 'melee', () => 0.5, { difficulty: 100 })
    expect(result.chance).toBeCloseTo(0.05, 5)
  })

  it('clamps chance to a 95% ceiling even at trivially low difficulty', () => {
    const { result } = performSkillCheck(BASE_STATE, 'melee', () => 0.5, { difficulty: -100 })
    expect(result.chance).toBeCloseTo(0.95, 5)
  })
})

describe('rollSkillCheck (destiny-p8sb)', () => {
  it('advances rngSeed deterministically', () => {
    const state: GameState = { ...BASE_STATE, rngSeed: 42 }
    const { nextState } = rollSkillCheck(state, 'melee')
    expect(nextState.rngSeed).not.toBe(42)
  })

  it('is deterministic for the same seed', () => {
    const state: GameState = { ...BASE_STATE, rngSeed: 7 }
    const first = rollSkillCheck(state, 'melee')
    const second = rollSkillCheck(state, 'melee')
    expect(first.result.success).toBe(second.result.success)
    expect(first.nextState.rngSeed).toBe(second.nextState.rngSeed)
  })
})
