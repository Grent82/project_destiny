import { createSelector } from '@reduxjs/toolkit'

import type { GameState } from '../../domain/game/contracts'

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
    if (foodCapacity <= 0) return 0
    const ratio = Math.min(Math.max(foodStock / foodCapacity, 0), 1)
    return Math.round(ratio * 100)
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
