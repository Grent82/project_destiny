import type { GameState } from '../../domain'
import type { ChronicleEntry } from '../../domain/chronicle/contracts'

export function selectChronicleEntries(state: { game: GameState }): ChronicleEntry[] {
  return Object.values(state.game.chronicle.entriesByDay)
    .sort((left, right) => {
      if (left.day !== right.day) return right.day - left.day
      return 0
    })
    .flatMap((bucket) => bucket.entries)
}
