import { describe, it, expect } from 'vitest'
import {
  standingTier,
  standingTierColor,
  standingDotPercent,
  formatStandingValue,
  STANDING_TIER_BANDS,
} from './factionStanding'

describe('standingTier', () => {
  it('classifies the five bands at their boundaries', () => {
    expect(standingTier(-100)).toBe('Hostile')
    expect(standingTier(-60)).toBe('Hostile')
    expect(standingTier(-59)).toBe('Cold')
    expect(standingTier(-20)).toBe('Cold')
    expect(standingTier(-19)).toBe('Neutral')
    expect(standingTier(20)).toBe('Neutral')
    expect(standingTier(21)).toBe('Warm')
    expect(standingTier(60)).toBe('Warm')
    expect(standingTier(61)).toBe('Allied')
    expect(standingTier(100)).toBe('Allied')
  })
})

describe('standingTierColor', () => {
  it('always matches the color of the band standingTier reports for the same value', () => {
    // Regression guard: the pre-existing bug this ticket fixed was the tier label and the
    // bar color being derived from two different, uncoordinated breakpoint sets.
    for (const standing of [-100, -65, -60, -45, -20, -19, 0, 20, 21, 45, 60, 61, 100]) {
      const tier = standingTier(standing)
      const band = STANDING_TIER_BANDS.find((b) => b.tier === tier)!
      expect(standingTierColor(standing)).toBe(band.color)
    }
  })
})

describe('standingDotPercent', () => {
  it('maps -100..100 onto 0..100', () => {
    expect(standingDotPercent(-100)).toBe(0)
    expect(standingDotPercent(0)).toBe(50)
    expect(standingDotPercent(100)).toBe(100)
  })

  it('clamps out-of-range values', () => {
    expect(standingDotPercent(-500)).toBe(0)
    expect(standingDotPercent(500)).toBe(100)
  })
})

describe('formatStandingValue', () => {
  it('prefixes positive values with a plus sign and leaves negatives/zero as-is', () => {
    expect(formatStandingValue(10)).toBe('+10')
    expect(formatStandingValue(-65)).toBe('-65')
    expect(formatStandingValue(0)).toBe('0')
  })
})
