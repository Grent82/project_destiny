import type { GameState } from "../../../../domain"
import type { Rng } from "../../seededRng"
import { applyWorldHouseholdGrowth } from "../../applyWorldHouseholdGrowth"
import { applyAbstractCustodySimulation } from "../../applyAbstractCustodySimulation"
import { applyMiraCustodyRoutine } from "../../applyMiraCustodyRoutine"
import { applyNpcRoomInteractions } from "../../applyNpcRoomInteractions"
import { applySiteStateHooks } from "../../applySiteStateHooks"
import { applyFactionQuestBonus } from "../../applyFactionActivity"
import { applyAllNpcAgency } from "../../npcAgency"
import { applyInitiativeAgency } from "../../npcAgency/initiativeAgency"
import { applyFactionActivity } from "../../applyFactionActivity"
import { applyWorldNpcSocialSimulation } from "../../applyWorldNpcSocialSimulation"
import { applyRumorSpread } from "../../applyRumorSpread"
import { applyMoneyEarningIntentions } from "../../intentions/moneyEarning/applyMoneyEarningIntentions"
import { createRumorForNakedNpc } from "../../createRumorForNakedNpc"
import { simulateNpcNpcRomance } from "../../npcNpcRomance"
import { processAllowlistedNpcIntentions, executeAllowlistedNpcIntentions } from "../../intentions"
import { resolveAllNpcDatesForCurrentSlot } from "../../resolveNpcDate"

/**
 * Owns: NPC-NPC flirtation/jealousy flavor (simulateNpcNpcRomance) and resolving dates
 * scheduled by yesterday's Pairing phase (resolveAllNpcDatesForCurrentSlot).
 */
export function handleSocialSimulationPhase(state: GameState, rng: Rng): GameState {
  let next = state

  // Phase: World household and NPC social simulation
  next = applyWorldHouseholdGrowth(next, rng)
  next = applyAbstractCustodySimulation(next, rng)
  next = applyMiraCustodyRoutine(next, rng)
  next = applyNpcRoomInteractions(next, rng)
  next = applySiteStateHooks(next)

  // Faction and NPC agency
  next = applyFactionQuestBonus(next)
  next = applyAllNpcAgency(next, rng)
  next = applyInitiativeAgency(next, rng)
  next = applyFactionActivity(next)
  next = applyWorldNpcSocialSimulation(next, rng)
  next = applyRumorSpread(next, rng)

  // NPC Intention system: generation gated to the wired allowlist (visit-lover, spend-time-with
  // only — see destiny-7ekd/destiny-mbju). Generation runs before the money-earning check below
  // but can never produce a money-earning type, so it stays inert for that system as before.
  next = processAllowlistedNpcIntentions(next)

  // Money-earning intentions (NPCs earning extra income)
  next = applyMoneyEarningIntentions(next)

  // Execute any wired intentions generated above (visit-lover, spend-time-with)
  next = executeAllowlistedNpcIntentions(next)

  // NPC-NPC romance simulation: flirtation, jealousy
  next = simulateNpcNpcRomance(next, rng)

  // Resolve any scheduled NPC-NPC dates for the current time slot
  next = resolveAllNpcDatesForCurrentSlot(next, rng)

  // Check for naked NPCs in public districts and generate scandal rumors
  // This runs after all NPC actions have been processed
  for (const npc of next.roster) {
    if (npc.assignedDistrictId) {
      next = createRumorForNakedNpc(next, {
        npcId: npc.npcId,
        districtId: npc.assignedDistrictId,
        day: state.day,
      })
    }
  }

  return next
}
