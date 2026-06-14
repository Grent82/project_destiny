import { describe, expect, it } from 'vitest'

import {
  selectFoodSecurity,
  selectFoodStock,
  selectFoodCapacity,
  selectWaterAccess,
  selectMaterialStock,
  selectCorridorStatus,
} from './economy'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeState(overrides: Partial<typeof initialGameStateSnapshot> = {}): { game: typeof initialGameStateSnapshot } {
  return {
    game: {
      ...initialGameStateSnapshot,
      ...overrides,
    },
  }
}

describe('selectFoodSecurity', () => {
  it('returns 0 when food stock is zero', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0 },
    })
    expect(selectFoodSecurity(state)).toBe(0)
  })

  it('returns 100 when food stock is full', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1000 },
    })
    expect(selectFoodSecurity(state)).toBe(100)
  })

  it('returns 50 when food stock is half', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500 },
    })
    expect(selectFoodSecurity(state)).toBe(50)
  })

  it('returns 62 when food stock is 620 of 1000 capacity', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 620 },
    })
    expect(selectFoodSecurity(state)).toBe(62)
  })

  it('clamps to 100 when stock exceeds capacity', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1500 },
    })
    expect(selectFoodSecurity(state)).toBe(100)
  })

  it('defaults to 0 when capacity is zero', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 100, foodCapacity: 0 },
    })
    expect(selectFoodSecurity(state)).toBe(0)
  })
})

describe('selectFoodStock', () => {
  it('returns the food stock value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 750 },
    })
    expect(selectFoodStock(state)).toBe(750)
  })

  it('defaults to 0 when food stock is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0 },
    })
    expect(selectFoodStock(state)).toBe(0)
  })
})

describe('selectFoodCapacity', () => {
  it('returns the food capacity value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodCapacity: 2000 },
    })
    expect(selectFoodCapacity(state)).toBe(2000)
  })

  it('defaults to 1000 when capacity is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodCapacity: 1000 },
    })
    expect(selectFoodCapacity(state)).toBe(1000)
  })
})

describe('selectWaterAccess', () => {
  it('returns the water access value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, waterAccess: 85 },
    })
    expect(selectWaterAccess(state)).toBe(85)
  })
})

describe('selectMaterialStock', () => {
  it('returns the material stock value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, materialStock: 30 },
    })
    expect(selectMaterialStock(state)).toBe(30)
  })
})

describe('selectCorridorStatus', () => {
  it('returns the corridor status value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'disrupted' },
    })
    expect(selectCorridorStatus(state)).toBe('disrupted')
  })

  it('defaults to blocked when corridor status is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
    })
    expect(selectCorridorStatus(state)).toBe('blocked')
  })
})
