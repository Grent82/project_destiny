import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../domain'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../commands/squad'
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
    replaceGameState(_state, action: PayloadAction<GameState>) {
      return action.payload
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
