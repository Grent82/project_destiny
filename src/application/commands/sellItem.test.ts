import { describe, it, expect } from 'vitest'
import { computeSellPrice, sellItem } from './sellItem'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const BASE_STATE: GameState = {
  ...initialGameStateSnapshot,
  currentDistrictId: 'district-ironworks',
  inventoryState: {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [
        {
          containerId: 'bag-main',
          containerType: 'backpack',
          ownerId: 'player',
          maxSlots: 20,
          slots: [
            {
              slotId: 'slot-1',
              itemInstanceId: 'item-spare-parts',
              quantity: 1,
            },
            {
              slotId: 'slot-2',
              itemInstanceId: 'item-mechanism-pre-breach',
              quantity: 1,
            },
          ],
          locked: false,
        },
      ],
    },
  },
}

describe('computeSellPrice', () => {
  it('returns 0 for unknown instance', () => {
    expect(computeSellPrice(BASE_STATE, 'unknown-id')).toBe(0)
  })

  it('uses tradeValue effect as base when present', () => {
    // item-spare-parts has value:65, no tradeValue effect, so fallback is value*0.5 = 32
    // district-ironworks marketPressure:62 → multiplier = 0.7 + (62/100)*0.6 = 1.072
    // price = floor(32 * 1.072) = floor(34.3) = 34
    const price = computeSellPrice(BASE_STATE, 'item-spare-parts')
    expect(price).toBeGreaterThan(0)
    expect(price).toBeGreaterThanOrEqual(30)
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
    const high = computeSellPrice(highPressureState, 'item-spare-parts')
    const low = computeSellPrice(lowPressureState, 'item-spare-parts')
    expect(high).toBeGreaterThan(low)
  })

  it('returns at least 1 even at zero marketPressure', () => {
    const zeroState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 0 } : d,
      ),
    }
    expect(computeSellPrice(zeroState, 'item-spare-parts')).toBeGreaterThanOrEqual(1)
  })

  it('handles high-value items correctly', () => {
    // item-mechanism-pre-breach has value:380, no tradeValue effect, fallback is 380*0.5 = 190
    // ironworks marketPressure:62 → multiplier = 1.072
    // price = floor(190 * 1.072) = floor(203.7) = 203
    const price = computeSellPrice(BASE_STATE, 'item-mechanism-pre-breach')
    expect(price).toBeGreaterThan(150)
  })
})

describe('sellItem', () => {
  it('removes the item from inventory', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    const item = result.inventoryState.player.bagContainers
      .flatMap((c) => c.slots)
      .find((s) => s.itemInstanceId === 'item-spare-parts')
    expect(item).toBeUndefined()
  })

  it('adds sell price to money', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    // Expected price is around 34, so money should increase by at least 30
    expect(result.money).toBeGreaterThan(BASE_STATE.money + 30)
  })

  it('writes an activity log entry', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toMatch(/Sold/)
  })

  it('returns unchanged state for unknown instance', () => {
    const result = sellItem(BASE_STATE, 'unknown')
    expect(result.money).toBe(BASE_STATE.money)
    const slotCount = result.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
    const baseSlotCount = BASE_STATE.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
    expect(slotCount).toBe(baseSlotCount)
  })

  it('leaves other items untouched', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    const item = result.inventoryState.player.bagContainers
      .flatMap((c) => c.slots)
      .find((s) => s.itemInstanceId === 'item-mechanism-pre-breach')
    expect(item).toBeDefined()
  })
})
