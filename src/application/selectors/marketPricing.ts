import { createSelector } from '@reduxjs/toolkit'

import type { GameState } from '../../domain/game/contracts'
import { computePrice } from '../../domain/economy/priceDerivation'

const selectGame = (state: { game: GameState }): GameState => state.game

/**
 * Default food capacity for market state.
 */
export const DEFAULT_FOOD_CAPACITY = 1000

/**
 * Default base price for food items.
 */
export const DEFAULT_FOOD_BASE_PRICE = 10

/**
 * Select the current food market price derived from stock and demand.
 *
 * Uses the us4e price formula:
 *   price = basePrice * (1 + demandFactor - stockFactor * 0.5)
 *   clamped to [priceFloor, priceCeiling]
 */
export const selectFoodMarketPrice = createSelector(
  [selectGame],
  (game) => {
    const foodStock = game.cityResources.foodStock ?? 0
    const foodCapacity = game.cityResources.foodCapacity ?? DEFAULT_FOOD_CAPACITY
    const demandBaseline = 100 // Default normal demand

    // Price bounds: floor = 50% of base, ceiling = 250% of base
    const basePrice = DEFAULT_FOOD_BASE_PRICE
    const priceFloor = Math.round(basePrice * 0.5)
    const priceCeiling = Math.round(basePrice * 2.5)

    return computePrice(basePrice, foodStock, foodCapacity, demandBaseline, priceFloor, priceCeiling)
  }
)

/**
 * Select market pressure as a derived value from market state.
 * Formula: marketPressure = clamp((1 - stockRatio) * demandFactor * 100, 0, 100)
 */
export const selectMarketPressure = createSelector(
  [selectGame],
  (game) => {
    const foodStock = game.cityResources.foodStock ?? 0
    const foodCapacity = game.cityResources.foodCapacity ?? DEFAULT_FOOD_CAPACITY
    const demandBaseline = 100 // Default normal demand

    if (foodCapacity <= 0) return 100

    const stockRatio = Math.min(Math.max(foodStock / foodCapacity, 0), 1)
    const demandFactor = demandBaseline / 100
    const pressure = (1 - stockRatio) * demandFactor * 100

    return Math.max(Math.min(Math.round(pressure), 100), 0)
  }
)

/**
 * Compute price modifier based on current food market price vs base price.
 * Returns a multiplier that can be applied to shop prices.
 */
export function computeFoodPriceModifier(marketPrice: number, basePrice: number): number {
  if (basePrice <= 0) return 1.0
  return marketPrice / basePrice
}

/**
 * Get a human-readable description of the current market price state.
 */
export function describeFoodMarketState(marketPrice: number, basePrice: number): string {
  const ratio = marketPrice / basePrice

  if (ratio >= 2.0) return 'Severe shortage - prices doubled'
  if (ratio >= 1.5) return 'Shortage - prices elevated'
  if (ratio >= 1.2) return 'Tight supply - slight premium'
  if (ratio <= 0.6) return 'Surplus - prices depressed'
  if (ratio <= 0.8) return 'Good supply - discount available'
  return 'Normal supply'
}
