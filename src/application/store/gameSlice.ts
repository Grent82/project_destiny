import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../domain'
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
    replaceGameState(_state, action: PayloadAction<GameState>) {
      return action.payload
    },
    setProtagonistName(state, action: PayloadAction<string>) {
      state.protagonistName = action.payload
    },
    setHasSeenOpening(state, action: PayloadAction<boolean>) {
      state.hasSeenOpening = action.payload
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
