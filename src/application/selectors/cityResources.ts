import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

export const selectCityResources = createSelector(
  [selectGame],
  (game) => game.cityResources,
)

export const selectFoodSecurity = createSelector(
  [selectGame],
  (game) => game.cityResources.foodSecurity,
)

export const selectCorridorStatus = createSelector(
  [selectGame],
  (game) => game.cityResources.corridorStatus,
)

export const selectShopPriceModifier = (state: RootState): number => {
  const status = state.game.cityResources.corridorStatus
  if (status === 'blocked') return 1.3
  if (status === 'disrupted') return 1.15
  return 1.0
}
