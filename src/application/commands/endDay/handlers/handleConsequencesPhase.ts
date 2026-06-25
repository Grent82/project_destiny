import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyNpcConsequences } from "../../applyNpcConsequences"

export function handleConsequencesPhase(state: GameState, rng: Rng): GameState {
  // Phase: Relationship drift, NPC departure, durability warnings
  // Passes original relationships so departure check uses start-of-day loyalty values.
  return applyNpcConsequences(state, state.relationships, rng)
}
