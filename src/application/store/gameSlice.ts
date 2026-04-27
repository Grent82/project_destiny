import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { CorridorStatus, GameState } from '../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../commands/combat'
import { purchaseItemFromShop } from '../commands/purchase'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../commands/squad'
import { endDay as endDayCommand } from '../commands/endDay'
import { initialGameStateSnapshot } from './initialGameState'

const gameSlice = createSlice({
  name: 'game',
  initialState: initialGameStateSnapshot,
  reducers: {
    addNpcToSelectedSquad(state, action: PayloadAction<string>) {
      return addNpcToSelectedSquad(state, action.payload)
    },
    removeNpcFromSelectedSquad(state, action: PayloadAction<string>) {
      return removeNpcFromSelectedSquad(state, action.payload)
    },
    purchaseItemFromShop(
      state,
      action: PayloadAction<{ shopId: string; itemId: string }>,
    ) {
      return purchaseItemFromShop(
        state,
        action.payload.shopId,
        action.payload.itemId,
      )
    },
    startCombatEncounter(state) {
      return startCombatEncounter(state)
    },
    performCombatAction(
      state,
      action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
    ) {
      return performCombatAction(state, action.payload)
    },
    concludeCombatEncounter(state) {
      return concludeCombatEncounter(state)
    },
    endDay(state) {
      return endDayCommand(state)
    },
    adjustCityResource(
      state,
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
    setCorridorStatus(state, action: PayloadAction<CorridorStatus>) {
      state.cityResources.corridorStatus = action.payload
    },
    replaceGameState(_state, action: PayloadAction<GameState>) {
      return action.payload
    },
    setProtagonistName(state, action: PayloadAction<string>) {
      state.protagonistName = action.payload
    },
    setHasSeenOpening(state, action: PayloadAction<boolean>) {
      state.hasSeenOpening = action.payload
    },
    adjustFactionStanding(
      state,
      action: PayloadAction<{ factionId: string; delta: number }>,
    ) {
      const { factionId, delta } = action.payload
      const current = state.factionStandings[factionId] ?? 0
      state.factionStandings[factionId] = Math.max(-100, Math.min(100, current + delta))
    },
    adjustCityDial(
      state,
      action: PayloadAction<{
        dial: 'control' | 'prosperity' | 'unrest' | 'corruption'
        delta: number
      }>,
    ) {
      const { dial, delta } = action.payload
      state.cityDials[dial] = Math.max(0, Math.min(100, state.cityDials[dial] + delta))
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
