import { createSelector } from '@reduxjs/toolkit'

import type { GameState } from '../../domain/game/contracts'
import {
  getCorridorReopeningProgress,
} from '../commands/applyCorridorImport'
import { calculateTotalConsumption } from '../commands/applyFoodConsumption'
import {
  BOUND_KITCHEN_HAND_YIELD,
  buildCanonicalFoodProducers,
  calculateFoodProductionTotal,
  deriveFoodSecurityFromStock,
  getCorridorImportAmount,
} from '../commands/foodFlow'
import {
  DEFAULT_FOOD_BASE_PRICE,
  describeFoodMarketState,
  selectFoodMarketPrice,
  selectMarketPressure,
} from './marketPricing'

const selectGame = (state: { game: GameState }): GameState => state.game

/**
 * Select food stock from city resources.
 */
export const selectFoodStock = createSelector(
  [selectGame],
  (game) => game.cityResources.foodStock ?? 0
)

/**
 * Select food capacity from city resources.
 */
export const selectFoodCapacity = createSelector(
  [selectGame],
  (game) => game.cityResources.foodCapacity ?? 1000
)

/**
 * Derive foodSecurity from food stock and capacity.
 * Formula: foodSecurity = (foodStock / foodCapacity) * 100
 *
 * This is the canonical derivation - all code should use this selector
 * instead of reading cityResources.foodSecurity directly.
 */
export const selectFoodSecurity = createSelector(
  [selectGame],
  (game) => {
    const foodStock = game.cityResources.foodStock ?? 0
    const foodCapacity = game.cityResources.foodCapacity ?? 1000
    return deriveFoodSecurityFromStock(foodStock, foodCapacity)
  }
)

/**
 * Select water access from city resources.
 */
export const selectWaterAccess = createSelector(
  [selectGame],
  (game) => game.cityResources.waterAccess ?? 0
)

/**
 * Select material stock from city resources.
 */
export const selectMaterialStock = createSelector(
  [selectGame],
  (game) => game.cityResources.materialStock ?? 0
)

/**
 * Select corridor status from city resources.
 */
export const selectCorridorStatus = createSelector(
  [selectGame],
  (game) => game.cityResources.corridorStatus ?? 'blocked'
)

export const selectEconomyOverview = createSelector(
  [
    selectGame,
    selectFoodStock,
    selectFoodCapacity,
    selectFoodSecurity,
    selectWaterAccess,
    selectMaterialStock,
    selectCorridorStatus,
    selectFoodMarketPrice,
    selectMarketPressure,
  ],
  (
    game,
    foodStock,
    foodCapacity,
    foodSecurity,
    waterAccess,
    materialStock,
    corridorStatus,
    foodPrice,
    marketPressure,
  ) => {
    const producers = buildCanonicalFoodProducers(game)
    const localOutput = calculateFoodProductionTotal(producers)
    const boundKitchenProducer = producers.find((producer) => producer.agentId === 'producer-bound-kitchen-service')
    const boundKitchenHands = boundKitchenProducer?.assignedLabor ?? 0
    const boundKitchenOutput = boundKitchenHands * BOUND_KITCHEN_HAND_YIELD
    const corridorImport = getCorridorImportAmount(corridorStatus)
    const dailyConsumption = calculateTotalConsumption(game)
    const netFoodDelta = localOutput + corridorImport - dailyConsumption

    let foodPriceTrend: 'rising' | 'steady' | 'falling' = 'steady'
    if (foodPrice > DEFAULT_FOOD_BASE_PRICE) foodPriceTrend = 'rising'
    else if (foodPrice < DEFAULT_FOOD_BASE_PRICE) foodPriceTrend = 'falling'

    return {
      foodStock,
      foodCapacity,
      foodSecurity,
      waterAccess,
      materialStock,
      localOutput,
      dailyConsumption,
      boundKitchenHands,
      boundKitchenOutput,
      corridorStatus,
      corridorImport,
      corridorProgress: getCorridorReopeningProgress(game),
      netFoodDelta,
      foodPrice,
      foodPriceTrend,
      marketPressure,
      marketState: describeFoodMarketState(foodPrice, DEFAULT_FOOD_BASE_PRICE),
      playerActions: {
        contractsRoute: '/contracts',
        marketRoute: game.currentDistrictId ? '/shops' : '/district-map',
        brokerageRoute: '/brokerage',
      },
    }
  },
)
