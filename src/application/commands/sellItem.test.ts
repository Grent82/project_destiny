import { describe, it, expect } from 'vitest'
import { computeSellPrice, sellItem } from './sellItem'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const BASE_STATE: GameState = {
  ...initialGameStateSnapshot,
  currentDistrictId: 'district-ironworks',
  ownedItems: [
    {
      instanceId: 'inst-spare-parts-01',
      itemId: 'item-spare-parts',
      location: 'inventory',
      quantity: 1,
    },
    {
      instanceId: 'inst-pre-breach-01',
      itemId: 'item-mechanism-pre-breach',
      location: 'inventory',
      quantity: 1,
    },
  ],
}

describe('computeSellPrice', () => {
  it('returns 0 for unknown instance', () => {
    expect(computeSellPrice(BASE_STATE, 'unknown-id')).toBe(0)
  })

  it('uses tradeValue effect as base when present', () => {
    // item-spare-parts has tradeValue:65, district-ironworks marketPressure:62
    // multiplier = 0.7 + (62/100)*0.6 = 0.7 + 0.372 = 1.072 → floor(65*1.072) = floor(69.68) = 69
    const price = computeSellPrice(BASE_STATE, 'inst-spare-parts-01')
    expect(price).toBeGreaterThan(0)
    expect(price).toBeGreaterThanOrEqual(50)
  })

  it('scales price with district marketPressure', () => {
    const highPressureState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 90 } : d,
      ),
    }
    const lowPressureState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 10 } : d,
      ),
    }
    const high = computeSellPrice(highPressureState, 'inst-spare-parts-01')
    const low = computeSellPrice(lowPressureState, 'inst-spare-parts-01')
    expect(high).toBeGreaterThan(low)
  })

  it('returns at least 1 even at zero marketPressure', () => {
    const zeroState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 0 } : d,
      ),
    }
    expect(computeSellPrice(zeroState, 'inst-spare-parts-01')).toBeGreaterThanOrEqual(1)
  })

  it('handles high-value items correctly', () => {
    // item-mechanism-pre-breach tradeValue:380, ironworks marketPressure:62
    const price = computeSellPrice(BASE_STATE, 'inst-pre-breach-01')
    expect(price).toBeGreaterThan(300)
  })
})

describe('sellItem', () => {
  it('removes the item from ownedItems', () => {
    const result = sellItem(BASE_STATE, 'inst-spare-parts-01')
    expect(result.ownedItems.find((o) => o.instanceId === 'inst-spare-parts-01')).toBeUndefined()
  })

  it('adds sell price to money', () => {
    const result = sellItem(BASE_STATE, 'inst-spare-parts-01')
    expect(result.money).toBeGreaterThan(BASE_STATE.money)
  })

  it('writes an activity log entry', () => {
    const result = sellItem(BASE_STATE, 'inst-spare-parts-01')
    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toMatch(/Sold/)
  })

  it('returns unchanged state for unknown instance', () => {
    const result = sellItem(BASE_STATE, 'unknown')
    expect(result.money).toBe(BASE_STATE.money)
    expect(result.ownedItems).toHaveLength(BASE_STATE.ownedItems.length)
  })

  it('leaves other items untouched', () => {
    const result = sellItem(BASE_STATE, 'inst-spare-parts-01')
    expect(result.ownedItems.find((o) => o.instanceId === 'inst-pre-breach-01')).toBeDefined()
  })
})
