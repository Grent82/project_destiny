import { describe, expect, it } from 'vitest'

import { applyFoodConsumption, calculateTotalConsumption, PER_CAPITA_CONSUMPTION } from './applyFoodConsumption'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeState(overrides: Partial<typeof initialGameStateSnapshot> = {}): typeof initialGameStateSnapshot {
  return {
    ...initialGameStateSnapshot,
    ...overrides,
  }
}

describe('applyFoodConsumption', () => {
  it('reduces food stock by total consumption', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 10000 },
    })
    const result = applyFoodConsumption(state)

    const expectedConsumption = calculateTotalConsumption(state)
    expect(result.cityResources.foodStock).toBe(10000 - expectedConsumption)
  })

  it('consumes food for roster members', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 10000 },
      roster: [
        ...initialGameStateSnapshot.roster,
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-test-2' },
      ],
    })
    const result = applyFoodConsumption(state)

    // 2 roster members * 1 unit each + districts
    const expectedConsumption = calculateTotalConsumption(state)
    expect(result.cityResources.foodStock).toBe(10000 - expectedConsumption)
  })

  it('clamps stock to 0 when consumption exceeds stock', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 10 },
    })
    const result = applyFoodConsumption(state)

    expect(result.cityResources.foodStock).toBe(0)
  })

  it('is deterministic for same state', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 5000 },
    })
    const result1 = applyFoodConsumption(state)
    const result2 = applyFoodConsumption(state)

    expect(result1.cityResources.foodStock).toBe(result2.cityResources.foodStock)
  })

  it('preserves other cityResources fields', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 5000 },
    })
    const result = applyFoodConsumption(state)

    expect(result.cityResources.waterAccess).toBe(state.cityResources.waterAccess)
    expect(result.cityResources.materialStock).toBe(state.cityResources.materialStock)
    expect(result.cityResources.corridorStatus).toBe(state.cityResources.corridorStatus)
  })
})

describe('calculateTotalConsumption', () => {
  it('calculates roster consumption', () => {
    const state = makeState({
      roster: [
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-1' },
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-2' },
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-3' },
      ],
      districts: [],
    })
    const consumption = calculateTotalConsumption(state)

    // 3 roster * 1 + 0 districts * 100 = 3
    expect(consumption).toBe(3)
  })

  it('calculates district consumption', () => {
    const state = makeState({
      roster: [],
      districts: [
        { ...initialGameStateSnapshot.districts[0], districtId: 'dist-1' },
        { ...initialGameStateSnapshot.districts[0], districtId: 'dist-2' },
      ],
    })
    const consumption = calculateTotalConsumption(state)

    // 0 roster * 1 + 2 districts * 100 = 200
    expect(consumption).toBe(200)
  })

  it('combines roster and district consumption', () => {
    const state = makeState({
      roster: [
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-1' },
        { ...initialGameStateSnapshot.roster[0], npcId: 'npc-2' },
      ],
      districts: [
        { ...initialGameStateSnapshot.districts[0], districtId: 'dist-1' },
      ],
    })
    const consumption = calculateTotalConsumption(state)

    // 2 roster * 1 + 1 district * 100 = 102
    expect(consumption).toBe(102)
  })
})

describe('PER_CAPITA_CONSUMPTION', () => {
  it('is set to 1 unit per person per day', () => {
    expect(PER_CAPITA_CONSUMPTION).toBe(1)
  })
})
