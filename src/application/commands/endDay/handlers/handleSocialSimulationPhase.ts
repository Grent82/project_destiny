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

  return next
}
