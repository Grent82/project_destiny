import { type GameState } from '../../domain/game/contracts'
import type { EconomicAgent } from '../../domain/economy/contracts'

/**
 * Producer location modifier for food production yield.
 * Inside the walls: 1.0x (baseline, safest)
 * Field belt: 0.8x (moderate risk/reward)
 * Corridor-fed: 1.2x (highest yield, vulnerable to corridor disruption)
 */
export type ProducerLocation = 'inside-walls' | 'field-belt' | 'corridor-fed'

export const PRODUCER_YIELD_MODIFIERS: Record<ProducerLocation, number> = {
  'inside-walls': 1.0,
  'field-belt': 0.8,
  'corridor-fed': 1.2,
}

/**
 * Producer agent: an EconomicAgent that can produce food.
 * Extends EconomicAgent with production-specific fields.
 */
export interface Producer extends EconomicAgent {
  producerLocation: ProducerLocation
  baselineYield: number // Base food units per day with full labor
  assignedLabor: number // Current labor assigned to this producer
  requiredLabor: number // Labor needed for full production
}

/**
 * applyFoodProduction: calculates daily food production from all producers.
 *
 * Production formula per producer:
 *   yield = baselineYield * locationModifier * laborFactor
 *   where laborFactor = min(assignedLabor / requiredLabor, 1.0)
 *
 * Total production is summed across all producers and added to food stock.
 *
 * @param state - Current game state
 * @param producers - Array of producer agents
 * @returns New game state with updated food stock
 */
export function applyFoodProduction(
  state: GameState,
  producers: Producer[]
): GameState {
  const { rng } = createRng(state.rngSeed)

  let totalProduction = 0

  for (const producer of producers) {
    const locationModifier = PRODUCER_YIELD_MODIFIERS[producer.producerLocation]
    const laborFactor = Math.min(producer.assignedLabor / (producer.requiredLabor || 1), 1.0)
    const baseYield = producer.baselineYield * locationModifier * laborFactor

    // Add small deterministic variance (±10%)
    const variance = (rng.next() * 0.2 - 0.1)
    const actualYield = Math.round(baseYield * (1 + variance))

    totalProduction += Math.max(0, actualYield)
  }

  const newFoodStock = state.cityResources.foodStock + totalProduction

  return {
    ...state,
    cityResources: {
      ...state.cityResources,
      foodStock: newFoodStock,
    },
    rngSeed: state.rngSeed + totalProduction, // Advance seed based on production
  }
}

// Simple seeded RNG for deterministic production
class SeededRng {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    // Simple LCG for deterministic randomness
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }
}

function createRng(seed: number): { rng: SeededRng } {
  return { rng: new SeededRng(seed) }
}
