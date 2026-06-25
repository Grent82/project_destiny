import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { tickLegacyIntent, tickPregnancyProgress } from "../../pursuePlayerLegacy"
import { applyBondServiceEffects } from "../../bondService"
import { checkBondAcquisitionOffers, applyNpcHeldConditionDecay } from "../../bondTransfer"

export function handleBondingPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: Legacy, pregnancy, and bond mechanics
  next = tickLegacyIntent(next, rng)
  next = tickPregnancyProgress(next)
  next = applyBondServiceEffects(next)
  next = checkBondAcquisitionOffers(next, rng)
  next = applyNpcHeldConditionDecay(next)

  return next
}
