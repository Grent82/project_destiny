import { configureStore } from '@reduxjs/toolkit'

import type { GameState } from '../../domain'
import { gameSliceReducer } from './gameSlice'
import { initialGameStateSnapshot } from './initialGameState'

export function createGameStore(preloadedState: GameState = initialGameStateSnapshot) {
  return configureStore({
    reducer: {
      game: gameSliceReducer,
    },
    preloadedState: {
      game: preloadedState,
    },
  })
}

export type GameStore = ReturnType<typeof createGameStore>
export type RootState = ReturnType<GameStore['getState']>
export type AppDispatch = GameStore['dispatch']
