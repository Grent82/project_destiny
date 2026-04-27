import { gameStateSchema, type GameState } from '../../domain'
import type { SaveGameStore } from '../../application/ports/saveGameStore'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
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

    return gameStateSchema.parse(parsed)
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
  return new LocalSaveSnapshotStore(window.localStorage, key)
}
