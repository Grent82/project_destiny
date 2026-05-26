import type { PayloadAction } from '@reduxjs/toolkit'

import type { CorridorStatus, GameState } from '../../../domain'
import { purchaseItemFromShop } from '../../commands/purchase'

export const resourcesReducers = {
  adjustCityResource(
    state: GameState,
    action: PayloadAction<{
      resource: 'foodSecurity' | 'waterAccess' | 'materialStock'
      delta: number
    }>,
  ) {
    const { resource, delta } = action.payload
    state.cityResources[resource] = Math.max(
      0,
      Math.min(100, state.cityResources[resource] + delta),
    )
  },

  setCorridorStatus(state: GameState, action: PayloadAction<CorridorStatus>) {
    state.cityResources.corridorStatus = action.payload
  },

  adjustCityDial(
    state: GameState,
    action: PayloadAction<{
      dial: 'control' | 'prosperity' | 'unrest' | 'corruption'
      delta: number
    }>,
  ) {
    const { dial, delta } = action.payload
    state.cityDials[dial] = Math.max(0, Math.min(100, state.cityDials[dial] + delta))
  },

  purchaseItemFromShop(
    state: GameState,
    action: PayloadAction<{ shopId: string; itemId: string }>,
  ) {
    return purchaseItemFromShop(state, action.payload.shopId, action.payload.itemId)
  },
}
