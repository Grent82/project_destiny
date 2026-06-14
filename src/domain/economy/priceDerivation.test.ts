import { describe, expect, it } from 'vitest'

import { computePrice, computeFoodSecurity, computeMarketPressure } from './priceDerivation'

describe('computePrice', () => {
  const basePrice = 10
  const stockCapacity = 1000
  const priceFloor = 5
  const priceCeiling = 25

  it('returns base price at normal demand (100) and 50% stock', () => {
    // stockRatio = 0.5, demandFactor = 0, stockFactor = 0.5
    // priceMultiplier = 1 + 0 - (0.5 * 0.5) = 0.75
    // price = 10 * 0.75 = 7.5 -> rounds to 8
    const price = computePrice(basePrice, 500, stockCapacity, 100, priceFloor, priceCeiling)
    expect(price).toBe(8)
  })

  it('returns higher price when demand is high (150)', () => {
    // stockRatio = 0.5, demandFactor = 0.5, stockFactor = 0.5
    // priceMultiplier = 1 + 0.5 - (0.5 * 0.5) = 1.25
    // price = 10 * 1.25 = 12.5 -> rounds to 13 (Math.round)
    const price = computePrice(basePrice, 500, stockCapacity, 150, priceFloor, priceCeiling)
    expect(price).toBe(13)
  })

  it('returns lower price when demand is low (50)', () => {
    // stockRatio = 0.5, demandFactor = -0.5, stockFactor = 0.5
    // priceMultiplier = 1 + (-0.5) - (0.5 * 0.5) = 0.25
    // price = 10 * 0.25 = 2.5 -> clamped to floor 5
    const price = computePrice(basePrice, 500, stockCapacity, 50, priceFloor, priceCeiling)
    expect(price).toBe(5) // floor
  })

  it('returns price floor when stock is full and demand is low', () => {
    // stockRatio = 1.0, demandFactor = -0.5, stockFactor = 0
    // priceMultiplier = 1 + (-0.5) - 0 = 0.5
    // price = 10 * 0.5 = 5
    const price = computePrice(basePrice, 1000, stockCapacity, 50, priceFloor, priceCeiling)
    expect(price).toBe(5)
  })

  it('returns price ceiling when stock is empty and demand is high', () => {
    // stockRatio = 0, demandFactor = 1.0 (capped), stockFactor = 1
    // priceMultiplier = 1 + 1.0 - (1 * 0.5) = 1.5
    // price = 10 * 1.5 = 15
    // But with demandBaseline = 200, demandFactor = 1.0
    const price = computePrice(basePrice, 0, stockCapacity, 200, priceFloor, priceCeiling)
    expect(price).toBe(15)
  })

  it('clamps price to floor when calculation goes below', () => {
    // Very low demand, full stock
    const price = computePrice(basePrice, 1000, stockCapacity, 50, priceFloor, priceCeiling)
    expect(price).toBeGreaterThanOrEqual(priceFloor)
  })

  it('clamps price to ceiling when calculation goes above', () => {
    // Very high demand, empty stock
    const price = computePrice(basePrice, 0, stockCapacity, 200, priceFloor, priceCeiling)
    expect(price).toBeLessThanOrEqual(priceCeiling)
  })

  it('returns price ceiling when stock capacity is zero', () => {
    const price = computePrice(basePrice, 0, 0, 100, priceFloor, priceCeiling)
    expect(price).toBe(priceCeiling)
  })

  it('is deterministic for same inputs', () => {
    const inputs = [
      [10, 500, 1000, 100, 5, 25],
      [10, 500, 1000, 100, 5, 25],
      [10, 500, 1000, 100, 5, 25],
    ]
    const prices = inputs.map(args => computePrice(...(args as [number, number, number, number, number, number])))
    expect(prices[0]).toBe(prices[1])
    expect(prices[1]).toBe(prices[2])
  })
})

describe('computeFoodSecurity', () => {
  const foodCapacity = 1000

  it('returns 0 when stock is zero', () => {
    const security = computeFoodSecurity(0, foodCapacity)
    expect(security).toBe(0)
  })

  it('returns 100 when stock is full', () => {
    const security = computeFoodSecurity(1000, foodCapacity)
    expect(security).toBe(100)
  })

  it('returns 50 when stock is half', () => {
    const security = computeFoodSecurity(500, foodCapacity)
    expect(security).toBe(50)
  })

  it('returns 25 when stock is quarter', () => {
    const security = computeFoodSecurity(250, foodCapacity)
    expect(security).toBe(25)
  })

  it('clamps to 100 when stock exceeds capacity', () => {
    const security = computeFoodSecurity(1500, foodCapacity)
    expect(security).toBe(100)
  })

  it('returns 0 when capacity is zero', () => {
    const security = computeFoodSecurity(100, 0)
    expect(security).toBe(0)
  })
})

describe('computeMarketPressure', () => {
  const stockCapacity = 1000

  it('returns 0 when stock is full and demand is normal', () => {
    // stockRatio = 1, demandFactor = 1
    // pressure = (1 - 1) * 1 * 100 = 0
    const pressure = computeMarketPressure(1000, stockCapacity, 100)
    expect(pressure).toBe(0)
  })

  it('returns high pressure when stock is empty and demand is high', () => {
    // stockRatio = 0, demandFactor = 2 (for 200)
    // pressure = (1 - 0) * 2 * 100 = 200 -> clamped to 100
    const pressure = computeMarketPressure(0, stockCapacity, 200)
    expect(pressure).toBe(100)
  })

  it('returns moderate pressure at 50% stock and normal demand', () => {
    // stockRatio = 0.5, demandFactor = 1
    // pressure = (1 - 0.5) * 1 * 100 = 50
    const pressure = computeMarketPressure(500, stockCapacity, 100)
    expect(pressure).toBe(50)
  })

  it('returns low pressure when demand is low', () => {
    // stockRatio = 0.5, demandFactor = 0.5
    // pressure = (1 - 0.5) * 0.5 * 100 = 25
    const pressure = computeMarketPressure(500, stockCapacity, 50)
    expect(pressure).toBe(25)
  })

  it('returns 100 when capacity is zero', () => {
    const pressure = computeMarketPressure(0, 0, 100)
    expect(pressure).toBe(100)
  })

  it('is deterministic for same inputs', () => {
    const inputs = [
      [500, 1000, 100],
      [500, 1000, 100],
      [500, 1000, 100],
    ]
    const pressures = inputs.map(args => computeMarketPressure(...(args as [number, number, number])))
    expect(pressures[0]).toBe(pressures[1])
    expect(pressures[1]).toBe(pressures[2])
  })
})
