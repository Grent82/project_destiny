import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyNpcPairing } from "../../applyNpcPairing"
import { applyHouseholdIntimacy } from "../../applyHouseholdIntimacy"
import { processNpcDateProposals } from "../../scheduleNpcDateProposals"
import { generateNpcDateProposals } from "../../generateNpcDateProposals"

/**
 * Owns: NPC-NPC intimacy-stage progression (applyNpcPairing) and date proposal
 * generation + scheduling (generateNpcDateProposals/processNpcDateProposals).
 */
export function handlePairingPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: NPC-to-NPC pairing and household intimacy
  next = applyNpcPairing(next, rng)
  next = applyHouseholdIntimacy(next)

  // Generate autonomous NPC-NPC date proposals (1-2% chance per idle pair)
  next = generateNpcDateProposals(next, rng)

  // Process NPC-NPC date proposals (schedule accepted ones, reject stale ones)
  next = processNpcDateProposals(next)

  return next
}
