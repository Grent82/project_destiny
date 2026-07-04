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

    const loaded = snapshotStore.load()
    expect(loaded).not.toBeNull()
    expect(loaded?.saveVersion).toBe(5)
    expect(loaded?.inventoryState.player.bagContainers).toBeDefined()
    expect(loaded?.inventoryState.npcInventories).toBeDefined()
  })

  it('returns null when no snapshot is stored', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    expect(snapshotStore.load()).toBeNull()
  })

  it('returns null and clears storage when save is invalid (graceful degradation)', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem('save-slot', JSON.stringify({ day: 'invalid' }))

    const result = snapshotStore.load()
    expect(result).toBeNull()
    // Stale save should be auto-cleared
    expect(storage.getItem('save-slot')).toBeNull()
  })

  it('migrates a v0 save (no saveVersion) to v1 instead of discarding it', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // A minimal v0 save that lacks saveVersion and uses old playerCharacter shape
    const v0Save = {
      ...initialGameStateSnapshot,
      saveVersion: undefined,
      playerCharacter: {
        name: 'Old Hero',
        // old saves had no attributes object — just top-level stats
      },
    }
    // Remove saveVersion key entirely to simulate v0
    const { saveVersion: _omit, ...v0SaveWithoutVersion } = v0Save as typeof v0Save & { saveVersion: unknown }
    void _omit
    storage.setItem('save-slot', JSON.stringify(v0SaveWithoutVersion))

    const result = snapshotStore.load()
    expect(result).not.toBeNull()
    expect(result?.saveVersion).toBe(1)
    expect(result?.playerCharacter.attributes).toBeDefined()
  })

  it('returns null and clears storage for an unknown future save version', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem('save-slot', JSON.stringify({ ...initialGameStateSnapshot, saveVersion: 999 }))

    const result = snapshotStore.load()
    expect(result).toBeNull()
    expect(storage.getItem('save-slot')).toBeNull()
  })

  it('normalizes legacy pending events into concrete event instances on load', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem(
      'save-slot',
      JSON.stringify({
        ...initialGameStateSnapshot,
        pendingEvents: [{ eventId: 'event-unpaid-wages-unrest', firedOnDay: 3 }],
        eventInstances: [],
      }),
    )

    const result = snapshotStore.load()

    expect(result?.pendingEvents[0]?.instanceId).toBeTruthy()
    expect(result?.eventInstances).toHaveLength(1)
    expect(result?.eventInstances[0]).toMatchObject({
      eventId: 'event-unpaid-wages-unrest',
      firedOnDay: 3,
      resolvedOnDay: null,
    })
  })
})
