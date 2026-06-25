import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyOpponentPressure, logOpponentPressure } from "../../applyOpponentPressure"
import { applyNpcTraitDrift } from "../../applyNpcTraitDrift"
import { checkNpcArcTransitions, checkFracturedArcBranching } from "../../checkNpcArcTransitions"
import { applyPersonalityFriction } from "../../applyPersonalityFriction"

export function handlePersonalityPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: Opponent pressure and trait dynamics
  const opponentPressureRandoms = Array.from({ length: next.activeQuests.length }, () => rng())
  const pressured = applyOpponentPressure(next, opponentPressureRandoms)
  logOpponentPressure(next, pressured)

  // Experiential trait drift and arc stage transitions
  next = applyNpcTraitDrift(next, rng)
  next = checkNpcArcTransitions(next, rng)
  next = checkFracturedArcBranching(next)

  // Personality friction (every 2 days)
  const nextDay = next.day + 1
  if (nextDay % 2 === 0) {
    next = applyPersonalityFriction(next, rng)
  }

  return next
}
