import type { GameState } from "../../../../domain"
import { applyCaptivityDegradation } from "../legacy"
import { tickWardStages } from "../../houseWard"
import { checkMainQuestProgression } from "../legacy"

export function handleCaptivityPhase(state: GameState): GameState {
  let next = state

  // Phase: Captivity degradation and main quest progression
  next = applyCaptivityDegradation(next)
  next = tickWardStages(next)
  next = checkMainQuestProgression(next)

  return next
}
