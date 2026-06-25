import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyPolitics } from "../../applyPolitics"

export function handlePoliticsPhase(state: GameState, rng: Rng): GameState {
  // Phase: Politics, factions, debt dynamics
  return applyPolitics(state, rng)
}
