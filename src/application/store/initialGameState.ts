import initialGameState from '../../../data/runtime/initial-game-state.json'
import { gameStateSchema, type GameState } from '../../domain'
import { initializeRosterRelationships } from '../commands/initializeRosterRelationships'
import { createRng } from '../commands/seededRng'

let initialGameStateSnapshot: GameState
try {
  const parsed = gameStateSchema.parse(initialGameState)
  const { rng } = createRng(parsed.rngSeed)
  initialGameStateSnapshot = initializeRosterRelationships(parsed, rng)
} catch (err) {
  console.error('Failed to parse initial game state:', err)
  throw new Error('Game state schema validation failed. Check data/runtime/initial-game-state.json matches the current schema.', { cause: err })
}

export { initialGameStateSnapshot }
