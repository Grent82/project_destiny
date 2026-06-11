import { configureStore } from '@reduxjs/toolkit'

import type { GameState } from '../../domain'
import { gameSliceReducer } from './gameSlice'
import { initialGameStateSnapshot } from './initialGameState'
import { createBrowserSaveSnapshotStore } from '../../infrastructure/persistence/localSaveSnapshot'

let autosaveSubscriber: (() => void) | null = null

export function createGameStore(preloadedState: GameState = initialGameStateSnapshot) {
  const store = configureStore({
    reducer: {
      game: gameSliceReducer,
    },
    preloadedState: {
      game: preloadedState,
    },
  })

  // Set up autosave subscriber - saves after every state change
  const saveStore = createBrowserSaveSnapshotStore()
  autosaveSubscriber = () => {
    const state = store.getState().game
    try {
      saveStore.save(state)
    } catch (err) {
      console.error('[GameStore] Autosave failed:', err)
    }
  }

  store.subscribe(autosaveSubscriber)

  return store
}

export type GameStore = ReturnType<typeof createGameStore>
export type RootState = ReturnType<GameStore['getState']>
export type AppDispatch = GameStore['dispatch']

/**
 * Returns the autosave subscriber function, or null if store not initialized.
 * Used by tests to unsubscribe between runs.
 */
export function getAutosaveSubscriber(): (() => void) | null {
  return autosaveSubscriber
}
