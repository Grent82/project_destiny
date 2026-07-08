import { describe, expect, it } from 'vitest'
import { getFactionStandingTier } from './factions'

describe('getFactionStandingTier (destiny-09wr)', () => {
  it('resolves the boundary case that used to disagree between screens (+10 -> Neutral)', () => {
    expect(getFactionStandingTier(10)).toBe('Neutral')
  })

  it('covers every tier boundary', () => {
    expect(getFactionStandingTier(-100)).toBe('Hostile')
    expect(getFactionStandingTier(-60)).toBe('Hostile')
    expect(getFactionStandingTier(-59)).toBe('Cold')
    expect(getFactionStandingTier(-20)).toBe('Cold')
    expect(getFactionStandingTier(-19)).toBe('Neutral')
    expect(getFactionStandingTier(20)).toBe('Neutral')
    expect(getFactionStandingTier(21)).toBe('Warm')
    expect(getFactionStandingTier(60)).toBe('Warm')
    expect(getFactionStandingTier(61)).toBe('Allied')
    expect(getFactionStandingTier(100)).toBe('Allied')
  })
})
