import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyWages } from "../../applyWages"
import { applyTitleEffects } from "../../applyTitleEffects"

export function handleWagesPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase 1: Economic obligations - wages and title-based income
  next = applyWages(next)
  next = applyTitleEffects(next, rng)

  return next
}
