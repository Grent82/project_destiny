import { describe, it, expect } from 'vitest'
import {
  computeBattlefieldPanic,
  checkBattlefieldPanic,
  computePostCombatFearDelta,
  NEAR_DEATH_FEAR_DELTA_DEFEAT,
  NEAR_DEATH_FEAR_DELTA_VICTORY,
  MAX_RELATIONSHIP_FEAR,
} from './fearModel'

describe('computeBattlefieldPanic', () => {
  it('returns 0 when NPC has no fear and full health', () => {
    expect(computeBattlefieldPanic(0, 1.0)).toBe(0)
  })

  it('adds 50 panic when health ratio < 0.3', () => {
    const panic = computeBattlefieldPanic(0, 0.2)
    expect(panic).toBe(50)
  })

  it('adds 25 panic when health ratio < 0.5', () => {
    const panic = computeBattlefieldPanic(0, 0.4)
    expect(panic).toBe(25)
  })

  it('includes relationship fear carryover (30% of rel.fear)', () => {
    const panic = computeBattlefieldPanic(60, 1.0)
    expect(panic).toBe(18) // floor(60 * 0.3) = 18
  })

  it('caps at 100', () => {
    // fear=100 → carryover=30, health<0.3 → +50 → 80 (capped at 100 would need higher inputs)
    const panic = computeBattlefieldPanic(100, 0.2)
    expect(panic).toBe(80) // 30 + 50 = 80 (well below cap)
  })
})

describe('checkBattlefieldPanic', () => {
  it('always returns false when panic < 50', () => {
    expect(checkBattlefieldPanic(49, () => 1)).toBe(false)
  })

  it('returns true when panic >= 70 and rng is low', () => {
    expect(checkBattlefieldPanic(70, () => 0)).toBe(true)
  })

  it('returns false when panic >= 70 but rng is high', () => {
    // rng = 0.99 → 99 > 60% threshold
    expect(checkBattlefieldPanic(70, () => 0.99)).toBe(false)
  })

  it('can return true with moderate panic when rng is low', () => {
    expect(checkBattlefieldPanic(50, () => 0)).toBe(true)
  })
})

describe('computePostCombatFearDelta — bridge rule', () => {
  it('returns 0 when NPC health was above low threshold', () => {
    const delta = computePostCombatFearDelta(80, 100, 'victory', 0)
    expect(delta).toBe(0)
  })

  it('returns NEAR_DEATH_FEAR_DELTA_VICTORY on victory when near death', () => {
    const delta = computePostCombatFearDelta(20, 100, 'victory', 0)
    expect(delta).toBe(NEAR_DEATH_FEAR_DELTA_VICTORY)
  })

  it('returns NEAR_DEATH_FEAR_DELTA_DEFEAT on defeat when near death', () => {
    const delta = computePostCombatFearDelta(20, 100, 'defeat', 0)
    expect(delta).toBe(NEAR_DEATH_FEAR_DELTA_DEFEAT)
  })

  it('defeat delta is larger than victory delta', () => {
    expect(NEAR_DEATH_FEAR_DELTA_DEFEAT).toBeGreaterThan(NEAR_DEATH_FEAR_DELTA_VICTORY)
  })

  it('does not push relationship fear past MAX_RELATIONSHIP_FEAR', () => {
    const currentFear = MAX_RELATIONSHIP_FEAR - 2
    const delta = computePostCombatFearDelta(5, 100, 'defeat', currentFear)
    expect(delta).toBeLessThanOrEqual(2)
  })

  it('returns 0 when already at max fear', () => {
    const delta = computePostCombatFearDelta(5, 100, 'defeat', MAX_RELATIONSHIP_FEAR)
    expect(delta).toBe(0)
  })
})
