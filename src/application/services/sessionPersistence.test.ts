import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { createGameStore } from '../store/gameStore'
import { loadSavedSession, saveCurrentSession } from './sessionPersistence'
import type { SaveGameStore } from '../ports/saveGameStore'

function createMemorySaveStore(
  initialValue: ReturnType<SaveGameStore['load']> = null,
): SaveGameStore {
  let snapshot = initialValue

  return {
    load() {
      return snapshot
    },
    save(state) {
      snapshot = state
    },
    clear() {
      snapshot = null
    },
  }
}

describe('session persistence orchestration', () => {
  it('saves the current game state through the save store', () => {
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    saveCurrentSession(store, saveStore)

    expect(saveStore.load()).toEqual(initialGameStateSnapshot)
  })

  it('loads a saved game state and replaces the runtime store state', () => {
    const store = createGameStore()
    const savedState = {
      ...initialGameStateSnapshot,
      money: 123,
    }
    const saveStore = createMemorySaveStore(savedState)

    const didLoad = loadSavedSession(store, saveStore)

    expect(didLoad).toBe(true)
    expect(store.getState().game.money).toBe(123)
  })

  it('returns false when no save exists', () => {
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    const didLoad = loadSavedSession(store, saveStore)

    expect(didLoad).toBe(false)
    expect(store.getState().game).toEqual(initialGameStateSnapshot)
  })
})
