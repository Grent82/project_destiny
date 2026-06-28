import type { GameState } from "../../../../domain"
import { applyFoodProduction } from "../../applyFoodProduction"
import { applyFoodConsumption } from "../../applyFoodConsumption"
import { applyCorridorImport } from "../../applyCorridorImport"
import { formCorridorGroup, processLeadCoalitionIntentions, processSupportCoalitionIntentions } from "../../expeditions/formCorridorGroup"
import { applyGroupLifecycle } from "../../expeditions/applyGroupLifecycle"
import { applyWorldCorridorClearance } from "../../applyCorridorImport"
import type { Rng } from "../../seededRng"

export function handleCorridorPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: Food supply chain and corridor dynamics
  next = applyFoodProduction(next)
  next = applyCorridorImport(next).state
  next = applyFoodConsumption(next)

  // World-driven corridor clearance (group efforts)
  // Process NPC intentions first - show preparation activity before coalition forms
  next = processLeadCoalitionIntentions(next)
  next = processSupportCoalitionIntentions(next)
  next = formCorridorGroup(next, rng)
  next = applyGroupLifecycle(next, rng)
  next = applyWorldCorridorClearance(next, rng)

  return next
}
