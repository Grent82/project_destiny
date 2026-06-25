import type { GameState } from "../../../../domain"
import { applyStateDecay } from "../../applyStateDecay"
import { applyThresholds } from "../../applyThresholds"

export function handleDecayPhase(state: GameState): GameState {
  let next = state

  // Phase 2: State decay and threshold management
  next = applyStateDecay(next)
  next = applyThresholds(next)

  return next
}
