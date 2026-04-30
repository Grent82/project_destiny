import { gameStateSchema, type GameState } from '../../domain'
import type { SaveGameStore } from '../../application/ports/saveGameStore'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function createMemoryStorage(): StorageLike {
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

function isStorageLike(value: unknown): value is StorageLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StorageLike).getItem === 'function' &&
    typeof (value as StorageLike).setItem === 'function' &&
    typeof (value as StorageLike).removeItem === 'function'
  )
}

export class LocalSaveSnapshotStore implements SaveGameStore {
  private readonly storage: StorageLike
  private readonly key: string

  constructor(storage: StorageLike, key = 'project-destiny.save') {
    this.storage = storage
    this.key = key
  }

  load(): GameState | null {
    const raw = this.storage.getItem(this.key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    const result = gameStateSchema.safeParse(parsed)

    if (!result.success) {
      console.warn('[SaveStore] Saved state failed schema validation — discarding stale save.', result.error.flatten())
      this.storage.removeItem(this.key)
      return null
    }

    return result.data
  }

  save(state: GameState): void {
    const validated = gameStateSchema.parse(state)

    this.storage.setItem(this.key, JSON.stringify(validated))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }
}

export function createBrowserSaveSnapshotStore(key?: string) {
  const storage = isStorageLike(window.localStorage)
    ? window.localStorage
    : createMemoryStorage()

  return new LocalSaveSnapshotStore(storage, key)
}
