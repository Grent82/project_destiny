import type { GameState } from "../../domain"
import { createRng } from "./seededRng"
import type { Rng } from "./seededRng"
import {
  handleWagesPhase,
  handleDecayPhase,
  handleCorridorPhase,
  handleResourcesPhase,
  handleConsequencesPhase,
  handleTimeAdvancePhase,
  handlePoliticsPhase,
  handleEventsPhase,
  handleSocialSimulationPhase,
  handlePersonalityPhase,
  handlePairingPhase,
  handleBondingPhase,
  handleCaptivityPhase,
  handleQuestsPhase,
} from "./endDay/handlers"

// Re-export for backwards compatibility — external consumers (e.g. ledger selector) import from here.
export { wageForStatus } from "./applyWages"
export { pruneExpiredQuestLeads, applyEndOfDayResources } from "./endDay/legacy"
export { applyCaptivityDegradation, checkMainQuestProgression } from "./endDay/legacy"

/**
 * End-of-day orchestration via phased execution.
 *
 * Phases run in order:
 * 1. WAGES — Economic obligations (wages, title income)
 * 2. DECAY — State decay and threshold management
 * 3. CORRIDOR — Food supply chain and corridor dynamics
 * 4. RESOURCES — City resource consequences
 * 5. CONSEQUENCES — Relationship drift, NPC departure
 * 6. TIME_ADVANCE — Day increment and house repairs
 * 7. POLITICS — Faction and political dynamics
 * 8. EVENTS — Event lifecycle and world events
 * 9. SOCIAL_SIMULATION — World NPC simulation and agency
 * 10. PERSONALITY — Opponent pressure, trait drift, arc transitions
 * 11. PAIRING — NPC-to-NPC pairing and intimacy
 * 12. BONDING — Legacy, pregnancy, bond mechanics
 * 13. CAPTIVITY — Captivity degradation, main quest progression
 * 14. QUESTS — Quest expiry and debt crisis
 */
export function endDay(state: GameState): GameState {
  const seeded = createRng(state.rngSeed)
  const rng: Rng = seeded.rng

  // Phase 1: WAGES
  let next = handleWagesPhase(state, rng)

  // Phase 2: DECAY (includes THRESHOLDS)
  next = handleDecayPhase(next)

  // Phase 3: CORRIDOR
  next = handleCorridorPhase(next, rng)

  // Phase 4: RESOURCES
  next = handleResourcesPhase(next)

  // Phase 5: CONSEQUENCES
  next = handleConsequencesPhase(next, rng)

  // Phase 6: TIME_ADVANCE
  next = handleTimeAdvancePhase(next)

  // Phase 7: POLITICS
  next = handlePoliticsPhase(next, rng)

  // Phase 8: EVENTS
  next = handleEventsPhase(next, rng, seeded)

  // Phase 9: SOCIAL_SIMULATION
  next = handleSocialSimulationPhase(next, rng)

  // Phase 10: PERSONALITY
  next = handlePersonalityPhase(next, rng)

  // Phase 11: PAIRING
  next = handlePairingPhase(next, rng)

  // Phase 12: BONDING
  next = handleBondingPhase(next, rng)

  // Phase 13: CAPTIVITY
  next = handleCaptivityPhase(next)

  // Phase 14: QUESTS
  next = handleQuestsPhase(next)

  // Store advanced RNG seed for next day's deterministic run
  return { ...next, rngSeed: seeded.getSeed() }
}
