import type { SaveGameStore } from '../ports/saveGameStore'
import { gameActions } from '../store/gameSlice'
import type { GameStore } from '../store/gameStore'

export function hasSavedSession(saveGameStore: SaveGameStore): boolean {
  return saveGameStore.load() !== null
}

export function saveCurrentSession(
  store: GameStore,
  saveGameStore: SaveGameStore,
): void {
  saveGameStore.save(store.getState().game)
}

export function loadSavedSession(
  store: GameStore,
  saveGameStore: SaveGameStore,
): boolean {
  const savedState = saveGameStore.load()

  if (!savedState) {
    return false
  }

  store.dispatch(gameActions.replaceGameState(savedState))

  return true
}
