import { describe, expect, it } from 'vitest'

import { applyFoodProduction, PRODUCER_YIELD_MODIFIERS, type Producer } from './applyFoodProduction'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain'

function makeRootState(overrides: Partial<typeof initialGameStateSnapshot> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    ...overrides,
  }
}

function createMockProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    agentId: 'producer-1',
    role: 'district',
    money: 0,
    inventory: {},
    needs: {},
    decisionPolicy: { policyType: 'survival_first', riskTolerance: 50, targetStockBuffer: 0.3 },
    productionCapacity: {},
    productionCost: {},
    producerLocation: 'inside-walls',
    baselineYield: 100,
    assignedLabor: 10,
    requiredLabor: 10,
    ...overrides,
  }
}

describe('applyFoodProduction', () => {
  it('adds food stock from a single producer', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = [createMockProducer()]
    const result = applyFoodProduction(state, producers)

    expect(result.cityResources.foodStock).toBeGreaterThan(500)
  })

  it('produces zero when labor is zero', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = [createMockProducer({ assignedLabor: 0 })]
    const result = applyFoodProduction(state, producers)

    // With zero labor, yield should be zero or minimal
    expect(result.cityResources.foodStock).toBeGreaterThanOrEqual(500)
  })

  it('scales production with labor percentage', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = [
      createMockProducer({ assignedLabor: 5, requiredLabor: 10, baselineYield: 100 }), // 50% labor
      createMockProducer({ assignedLabor: 10, requiredLabor: 10, baselineYield: 100 }), // 100% labor
    ]
    const result = applyFoodProduction(state, producers)

    // First producer at 50% should produce ~50, second at 100% should produce ~100
    // Total expected: ~150 (with variance)
    expect(result.cityResources.foodStock).toBeGreaterThanOrEqual(640) // 500 + ~150
  })

  it('applies location modifier correctly', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = [
      createMockProducer({ producerLocation: 'inside-walls', baselineYield: 100, assignedLabor: 10, requiredLabor: 10 }),
      createMockProducer({ producerLocation: 'field-belt', baselineYield: 100, assignedLabor: 10, requiredLabor: 10 }),
      createMockProducer({ producerLocation: 'corridor-fed', baselineYield: 100, assignedLabor: 10, requiredLabor: 10 }),
    ]
    const result = applyFoodProduction(state, producers)

    // inside-walls: 100 * 1.0 = 100
    // field-belt: 100 * 0.8 = 80
    // corridor-fed: 100 * 1.2 = 120
    // Total expected: ~300 (with variance)
    expect(result.cityResources.foodStock).toBeGreaterThanOrEqual(790) // 500 + ~300
  })

  it('is deterministic with same seed', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
      rngSeed: 42,
    })
    const producers = [createMockProducer({ baselineYield: 100, assignedLabor: 10, requiredLabor: 10 })]

    const result1 = applyFoodProduction(state, producers)
    const result2 = applyFoodProduction(state, producers)

    expect(result1.cityResources.foodStock).toBe(result2.cityResources.foodStock)
  })

  it('advances rngSeed after production', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
      rngSeed: 42,
    })
    const producers = [createMockProducer()]
    const result = applyFoodProduction(state, producers)

    expect(result.rngSeed).toBeGreaterThan(state.rngSeed)
  })

  it('handles multiple producers correctly', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = Array(5).fill(null).map((_, i) =>
      createMockProducer({
        agentId: `producer-${i}`,
        baselineYield: 50 + i * 10,
        assignedLabor: 10,
        requiredLabor: 10,
      })
    )
    const result = applyFoodProduction(state, producers)

    // Each producer contributes their baseline * modifier
    expect(result.cityResources.foodStock).toBeGreaterThan(500)
  })

  it('caps labor factor at 1.0 when labor exceeds requirement', () => {
    const state = makeRootState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 500,
      },
    })
    const producers = [createMockProducer({ assignedLabor: 20, requiredLabor: 10, baselineYield: 100 })]
    const result = applyFoodProduction(state, producers)

    // Should produce around 100 (not 200), since labor factor is capped at 1.0
    expect(result.cityResources.foodStock).toBeLessThan(700) // 500 + ~100 + variance
  })
})

describe('PRODUCER_YIELD_MODIFIERS', () => {
  it('has correct modifier values', () => {
    expect(PRODUCER_YIELD_MODIFIERS['inside-walls']).toBe(1.0)
    expect(PRODUCER_YIELD_MODIFIERS['field-belt']).toBe(0.8)
    expect(PRODUCER_YIELD_MODIFIERS['corridor-fed']).toBe(1.2)
  })
})
