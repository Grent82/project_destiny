import type { GameState } from "../../../../domain"
import { applyEndOfDayResources } from "../legacy"

export function handleResourcesPhase(state: GameState): GameState {
  // Phase: City resource consequences (low food security effects)
  return applyEndOfDayResources(state)
}
