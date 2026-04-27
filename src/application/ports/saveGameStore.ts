import type { GameState } from '../../domain'

export interface SaveGameStore {
  load(): GameState | null
  save(state: GameState): void
  clear(): void
}
