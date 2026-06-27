import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyNpcConsequences } from "../../applyNpcConsequences"
import { applyNakednessConsequences } from "../../clothing/applyNakednessConsequences"

export function handleConsequencesPhase(state: GameState, rng: Rng): GameState {
  // Phase: Relationship drift, NPC departure, durability warnings
  // Passes original relationships so departure check uses start-of-day loyalty values.
  let next = applyNpcConsequences(state, state.relationships, rng)

  // Apply nakedness consequences (morale/stress penalties, rumors)
  next = applyNakednessConsequences(next)

  return next
}
