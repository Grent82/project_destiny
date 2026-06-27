import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { expireHireOffers } from "../../recruitment"
import { generateDistrictHireOffers } from "../../generateHireOffers"
import { evaluateEvents } from "../../evaluateEvents"
import { pruneExpiredQuestLeads } from "../legacy"
import { pruneExpiredEventInstances, compactResolvedEventInstances } from "../../eventInstances"
import { processMailDelivery } from "../../correspondence"

export function handleEventsPhase(
  state: GameState,
  rng: Rng,
  seeded: { rng: Rng; getSeed: () => number }
): GameState {
  let next = state

  // Phase: Event lifecycle and world events
  next = pruneExpiredEventInstances(next)
  next = compactResolvedEventInstances(next)
  next = pruneExpiredQuestLeads(next)

  // Process mail delivery - mark sent correspondence as delivered
  next = processMailDelivery(next)

  const afterExpiry = expireHireOffers(next)

  let afterEvents: GameState
  const nextDay = next.day + 1
  if (nextDay % 3 === 0 && afterExpiry.currentDistrictId) {
    const refreshed: GameState = { ...afterExpiry, availableForHire: [...afterExpiry.availableForHire] }
    generateDistrictHireOffers(refreshed, afterExpiry.currentDistrictId, undefined, rng)
    afterEvents = evaluateEvents(refreshed, rng, seeded)
  } else {
    afterEvents = evaluateEvents(afterExpiry, rng, seeded)
  }

  return afterEvents
}
