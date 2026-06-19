import { type GameState } from '../../domain/game/contracts'

import {
  type Producer,
  type ProducerLocation,
  buildCanonicalFoodProducers,
  calculateFoodProductionTotal,
  PRODUCER_YIELD_MODIFIERS,
  syncFoodSecurityToStock,
} from './foodFlow'

export {
  buildCanonicalFoodProducers,
  calculateFoodProductionTotal,
  PRODUCER_YIELD_MODIFIERS,
  type Producer,
  type ProducerLocation,
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
  producers: Producer[] = buildCanonicalFoodProducers(state),
): GameState {
  const totalProduction = calculateFoodProductionTotal(producers)

  const next = {
    ...state,
    cityResources: {
      ...state.cityResources,
      foodStock: state.cityResources.foodStock + totalProduction,
    },
    rngSeed: state.rngSeed + totalProduction,
  }

  return syncFoodSecurityToStock(next)
}
