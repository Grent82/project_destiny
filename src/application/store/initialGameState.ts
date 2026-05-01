import initialGameState from '../../../data/runtime/initial-game-state.json'
import { gameStateSchema, type GameState } from '../../domain'

let initialGameStateSnapshot: GameState
try {
  initialGameStateSnapshot = gameStateSchema.parse(initialGameState)
} catch (err) {
  console.error('Failed to parse initial game state:', err)
  throw new Error('Game state schema validation failed. Check data/runtime/initial-game-state.json matches the current schema.', { cause: err })
}

export { initialGameStateSnapshot }
