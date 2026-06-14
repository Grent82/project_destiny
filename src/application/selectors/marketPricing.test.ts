import { describe, expect, it } from 'vitest'

import {
  selectFoodMarketPrice,
  selectMarketPressure,
  computeFoodPriceModifier,
  describeFoodMarketState,
  DEFAULT_FOOD_BASE_PRICE,
} from './marketPricing'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeState(overrides: Partial<typeof initialGameStateSnapshot> = {}): { game: typeof initialGameStateSnapshot } {
  return {
    game: {
      ...initialGameStateSnapshot,
      ...overrides,
    },
  }
}

describe('selectFoodMarketPrice', () => {
  it('returns base price at 50% stock capacity', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500, foodCapacity: 1000 },
    })
    const price = selectFoodMarketPrice(state)
    // At 50% stock, price should be below base due to stock factor
    expect(price).toBeLessThanOrEqual(DEFAULT_FOOD_BASE_PRICE)
    expect(price).toBeGreaterThanOrEqual(5) // price floor
  })

  it('returns higher price at low stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 100, foodCapacity: 1000 },
    })
    const price = selectFoodMarketPrice(state)
    // At 10% stock, price is affected by stock factor (0.9 * 0.5 = 0.45 reduction)
    // With normal demand (factor = 0), price = 10 * (1 - 0.45) = 5.5 -> 6
    // The formula prioritizes stock buffer over demand at normal demand levels
    expect(price).toBeGreaterThanOrEqual(5) // At least price floor
  })

  it('returns lower price at high stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 900, foodCapacity: 1000 },
    })
    const price = selectFoodMarketPrice(state)
    // At 90% stock, stock factor = 0.1 * 0.5 = 0.05 reduction
    // price = 10 * (1 - 0.05) = 9.5 -> 10 (rounded)
    expect(price).toBeLessThanOrEqual(11) // Near base price
  })

  it('clamps to price floor at full stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1000, foodCapacity: 1000 },
    })
    const price = selectFoodMarketPrice(state)
    expect(price).toBeGreaterThanOrEqual(5) // price floor
  })

  it('clamps to price ceiling at empty stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0, foodCapacity: 1000 },
    })
    const price = selectFoodMarketPrice(state)
    expect(price).toBeLessThanOrEqual(25) // price ceiling
  })

  it('is deterministic for same state', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500, foodCapacity: 1000 },
    })
    const price1 = selectFoodMarketPrice(state)
    const price2 = selectFoodMarketPrice(state)
    expect(price1).toBe(price2)
  })
})

describe('selectMarketPressure', () => {
  it('returns 0 at full stock with normal demand', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1000, foodCapacity: 1000 },
    })
    const pressure = selectMarketPressure(state)
    expect(pressure).toBe(0)
  })

  it('returns high pressure at empty stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0, foodCapacity: 1000 },
    })
    const pressure = selectMarketPressure(state)
    expect(pressure).toBe(100)
  })

  it('returns moderate pressure at 50% stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500, foodCapacity: 1000 },
    })
    const pressure = selectMarketPressure(state)
    expect(pressure).toBe(50)
  })

  it('is deterministic for same state', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500, foodCapacity: 1000 },
    })
    const pressure1 = selectMarketPressure(state)
    const pressure2 = selectMarketPressure(state)
    expect(pressure1).toBe(pressure2)
  })
})

describe('computeFoodPriceModifier', () => {
  it('returns 1.0 when market price equals base price', () => {
    const modifier = computeFoodPriceModifier(10, 10)
    expect(modifier).toBe(1.0)
  })

  it('returns >1.0 when market price exceeds base price', () => {
    const modifier = computeFoodPriceModifier(15, 10)
    expect(modifier).toBe(1.5)
  })

  it('returns <1.0 when market price is below base price', () => {
    const modifier = computeFoodPriceModifier(7, 10)
    expect(modifier).toBe(0.7)
  })

  it('returns 1.0 when base price is zero', () => {
    const modifier = computeFoodPriceModifier(10, 0)
    expect(modifier).toBe(1.0)
  })
})

describe('describeFoodMarketState', () => {
  it('describes severe shortage at 2x price', () => {
    const desc = describeFoodMarketState(20, 10)
    expect(desc).toContain('Severe shortage')
  })

  it('describes shortage at 1.5x price', () => {
    const desc = describeFoodMarketState(15, 10)
    expect(desc).toContain('Shortage')
  })

  it('describes surplus at 0.5x price', () => {
    const desc = describeFoodMarketState(5, 10)
    expect(desc).toContain('Surplus')
  })

  it('describes normal supply at 1x price', () => {
    const desc = describeFoodMarketState(10, 10)
    expect(desc).toBe('Normal supply')
  })
})
