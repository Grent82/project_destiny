import { describe, it, expect } from 'vitest'
import {
  getDurabilityTier,
  getDurabilityAccuracyModifier,
  getDurabilityArmorModifier,
  degradeDurability,
} from './durability'

describe('getDurabilityTier', () => {
  it('returns broken at 0', () => {
    expect(getDurabilityTier(0)).toBe('broken')
  })
  it('returns damaged at 1', () => {
    expect(getDurabilityTier(1)).toBe('damaged')
  })
  it('returns damaged at 20', () => {
    expect(getDurabilityTier(20)).toBe('damaged')
  })
  it('returns worn at 21', () => {
    expect(getDurabilityTier(21)).toBe('worn')
  })
  it('returns worn at 50', () => {
    expect(getDurabilityTier(50)).toBe('worn')
  })
  it('returns good at 51', () => {
    expect(getDurabilityTier(51)).toBe('good')
  })
  it('returns good at 100', () => {
    expect(getDurabilityTier(100)).toBe('good')
  })
})

describe('getDurabilityAccuracyModifier', () => {
  it('returns 0 when broken', () => {
    expect(getDurabilityAccuracyModifier(0)).toBe(0)
  })
  it('returns 0.75 when damaged', () => {
    expect(getDurabilityAccuracyModifier(10)).toBe(0.75)
  })
  it('returns 0.9 when worn', () => {
    expect(getDurabilityAccuracyModifier(30)).toBe(0.9)
  })
  it('returns 1.0 when good', () => {
    expect(getDurabilityAccuracyModifier(100)).toBe(1.0)
  })
})

describe('getDurabilityArmorModifier', () => {
  it('returns 0 when broken', () => {
    expect(getDurabilityArmorModifier(0)).toBe(0)
  })
  it('returns 0.75 when damaged', () => {
    expect(getDurabilityArmorModifier(10)).toBe(0.75)
  })
  it('returns 0.9 when worn', () => {
    expect(getDurabilityArmorModifier(30)).toBe(0.9)
  })
  it('returns 1.0 when good', () => {
    expect(getDurabilityArmorModifier(100)).toBe(1.0)
  })
})

describe('degradeDurability', () => {
  it('reduces by amount', () => {
    expect(degradeDurability(100, 10)).toBe(90)
  })
  it('clamps to 0', () => {
    expect(degradeDurability(5, 10)).toBe(0)
  })
  it('returns 0 when already 0', () => {
    expect(degradeDurability(0, 5)).toBe(0)
  })
})
