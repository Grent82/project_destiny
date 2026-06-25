import type { GameState } from "../../../domain"
import type { CaptivityCondition } from "../../../domain/npc/contracts"
import { selectNpcCoercionRisk } from "../../selectors/npcs"
import { appendActivityLogEntry } from "../activityLog"
import { getAllNpcCaptivityStates, setNpcCaptivityState } from "../captivityRegistry"
import { isQuestLeadExpired, type QuestLeadRuntime } from "../../../domain/quests/contracts"

// Re-exported helper functions that are still used by phase handlers

export function pruneExpiredQuestLeads(state: GameState): GameState {
  const filtered = state.availableQuestLeads.filter(
    (lead: QuestLeadRuntime) => !isQuestLeadExpired(lead, state.day),
  )
  if (filtered.length === state.availableQuestLeads.length) return state
  return { ...state, availableQuestLeads: filtered }
}

export function applyEndOfDayResources(state: GameState): GameState {
  let next = state

  // Low food security -> extra hunger decay for all NPCs
  if (next.cityResources.foodSecurity < 40) {
    next = {
      ...next,
      roster: next.roster.map((npc) => ({
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.min(100, npc.states.hunger + 10),
        },
      })),
    }
    // Push unrest up each day
    next = {
      ...next,
      cityDials: { ...next.cityDials, unrest: Math.min(100, next.cityDials.unrest + 5) },
    }
  }

  // Corridor status -> food supply impact
  if (next.cityResources.corridorStatus === "blocked") {
    next = appendActivityLogEntry(
      next,
      "system",
      "The Green Corridor remains sealed. Food reserves dwindle.",
    )
  }

  return next
}

/** Every 7 days held: condition steps down one tier. At 'broken': rescue difficulty rises. */
const CAPTIVITY_DEGRADATION_DAYS = 7
const CONDITION_PROGRESSION: CaptivityCondition[] = ['healthy', 'hurt', 'broken', 'altered']

export function applyCaptivityDegradation(state: GameState): GameState {
  const captivityStates = getAllNpcCaptivityStates(state)
  const activeEntries = Object.entries(captivityStates).filter(
    ([npcId, cap]) => (cap.status === 'missing' || cap.status === 'captive') && npcId !== 'npc-mira',
  )
  if (activeEntries.length === 0) return state

  const next: GameState = {
    ...state,
    roster: state.roster.map((npc) => ({ ...npc })),
    npcCaptivityStates: { ...state.npcCaptivityStates },
  }

  for (const [npcId, cap] of activeEntries) {
    const rosterNpc = next.roster.find((npc) => npc.npcId === npcId)
    const newDays = cap.timeHeldDays + 1
    const risk = rosterNpc ? selectNpcCoercionRisk(rosterNpc) : 0
    const threshold = risk > 0.6 ? Math.max(1, Math.floor(CAPTIVITY_DEGRADATION_DAYS / 2)) : CAPTIVITY_DEGRADATION_DAYS
    const shouldDegrade = newDays > 0 && newDays % threshold === 0
    const currentIdx = CONDITION_PROGRESSION.indexOf(cap.condition)
    const newCondition: CaptivityCondition =
      shouldDegrade && currentIdx < CONDITION_PROGRESSION.length - 1
        ? CONDITION_PROGRESSION[currentIdx + 1]!
        : cap.condition
    setNpcCaptivityState(next, npcId, { ...cap, timeHeldDays: newDays, condition: newCondition })
  }

  return next
}

export function checkMainQuestProgression(state: GameState): GameState {
  const { stage } = state.mainQuest

  // location-known -> rescued: completing quest-mira-rescue
  if (stage === "location-known" && state.completedQuestIds.includes("quest-mira-rescue")) {
    return appendActivityLogEntry(
      {
        ...state,
        mainQuest: {
          stage: "rescued",
          lastClue: "",
        },
      },
      "system",
      "Mira is out. She is not the same. Neither are you.",
    )
  }

  return state
}
