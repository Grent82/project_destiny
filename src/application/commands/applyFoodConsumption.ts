import { type GameState } from '../../domain/game/contracts'

import { syncFoodSecurityToStock } from './foodFlow'

/**
 * Per-capita daily food consumption in units.
 * Based on typical rations: 1 unit = 1 person-day of food.
 */
export const PER_CAPITA_CONSUMPTION = 1

/**
 * applyFoodConsumption: calculates daily food consumption by all populations.
 *
 * Consumption formula:
 *   totalConsumption = sum(consumer.population * perCapitaConsumption)
 *
 * Consumers:
 *   - Player house roster (each NPC consumes 1 unit/day)
 *   - District populations (each district has a population value)
 *
 * If consumption exceeds stock:
 *   - Stock is reduced to 0 (not negative)
 *   - Shortfall triggers hunger increase via existing applyEndOfDayResources logic
 *
 * @param state - Current game state
 * @returns New game state with reduced food stock
 */
export function applyFoodConsumption(state: GameState): GameState {
  let totalConsumption = 0

  // Player house roster consumption
  const rosterPopulation = state.npcRuntimeStates.length
  totalConsumption += rosterPopulation * PER_CAPITA_CONSUMPTION

  // District population consumption (simplified: each district has base population)
  // In a fuller model, districts would have explicit population fields
  const districtBasePopulation = 100 // Base population per district
  const districtCount = state.districts.length
  totalConsumption += districtCount * districtBasePopulation * PER_CAPITA_CONSUMPTION

  // Calculate new stock (cannot go below 0)
  const newFoodStock = Math.max(0, state.cityResources.foodStock - totalConsumption)

  return {
    ...syncFoodSecurityToStock({
      ...state,
    cityResources: {
      ...state.cityResources,
      foodStock: newFoodStock,
    },
    }),
  }
}

/**
 * calculateTotalConsumption: helper to compute total daily consumption.
 * Useful for tests and planning.
 */
export function calculateTotalConsumption(state: GameState): number {
  const rosterPopulation = state.npcRuntimeStates.length
  const districtCount = state.districts.length
  const districtBasePopulation = 100

  return (
    rosterPopulation * PER_CAPITA_CONSUMPTION +
    districtCount * districtBasePopulation * PER_CAPITA_CONSUMPTION
  )
}
