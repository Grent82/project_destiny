import initialGameState from '../../../data/runtime/initial-game-state.json'
import { gameStateSchema, type GameState } from '../../domain'

export const initialGameStateSnapshot: GameState =
  gameStateSchema.parse(initialGameState)
