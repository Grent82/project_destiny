import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { LocalSaveSnapshotStore } from './localSaveSnapshot'

function createMemoryStorage() {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
  }
}

describe('LocalSaveSnapshotStore', () => {
  it('round-trips a valid game state snapshot', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    snapshotStore.save(initialGameStateSnapshot)

    expect(snapshotStore.load()).toEqual(initialGameStateSnapshot)
  })

  it('returns null when no snapshot is stored', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    expect(snapshotStore.load()).toBeNull()
  })

  it('rejects invalid stored snapshots during load', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem('save-slot', JSON.stringify({ day: 'invalid' }))

    expect(() => snapshotStore.load()).toThrow()
  })
})
