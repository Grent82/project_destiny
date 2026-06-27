import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyNpcPairing } from "../../applyNpcPairing"
import { applyHouseholdIntimacy } from "../../applyHouseholdIntimacy"
import { processNpcDateProposals } from "../../scheduleNpcDateProposals"

export function handlePairingPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: NPC-to-NPC pairing and household intimacy
  next = applyNpcPairing(next, rng)
  next = applyHouseholdIntimacy(next)

  // Process NPC-NPC date proposals (schedule accepted ones, reject stale ones)
  next = processNpcDateProposals(next, rng)

  return next
}
