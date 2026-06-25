import type { GameState } from "../../../../domain"
import { applyFoodProduction } from "../../applyFoodProduction"
import { applyFoodConsumption } from "../../applyFoodConsumption"
import { applyCorridorImport } from "../../applyCorridorImport"
import { formCorridorCoalition } from "../../expeditions/formCorridorCoalition"
import { applyCoalitionLifecycle } from "../../expeditions/applyCoalitionLifecycle"
import { applyWorldCorridorClearance } from "../../applyCorridorImport"
import type { Rng } from "../../seededRng"

export function handleCorridorPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: Food supply chain and corridor dynamics
  next = applyFoodProduction(next)
  next = applyCorridorImport(next).state
  next = applyFoodConsumption(next)

  // World-driven corridor clearance (coalition efforts)
  next = formCorridorCoalition(next, rng)
  next = applyCoalitionLifecycle(next, rng)
  next = applyWorldCorridorClearance(next, rng)

  return next
}
