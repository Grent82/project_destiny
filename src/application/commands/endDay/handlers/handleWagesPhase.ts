import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyWages } from "../../applyWages"
import { applyTitleEffects } from "../../applyTitleEffects"
import { payWardAllowance } from "../../houseWard"

export function handleWagesPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase 1: Economic obligations - wages and title-based income
  next = applyWages(next)
  next = applyTitleEffects(next, rng)

  // Phase 2: Ward allowance (weekly stipend for wards)
  next = payWardAllowance(next)

  return next
}
