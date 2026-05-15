import type { GameState } from "../../domain"
import type { CaptivityCondition } from "../../domain/npc/contracts"
import { selectNpcCoercionRisk } from "../selectors/npcs"
import { appendActivityLogEntry } from "./activityLog"
import { evaluateEvents } from "./evaluateEvents"
import { expireHireOffers } from "./recruitment"
import { contentCatalog } from "../content/contentCatalog"
import { generateDistrictHireOffers } from "./generateHireOffers"
import { createRng, type Rng } from "./seededRng"
import { applyWages } from "./applyWages"
import { applyStateDecay } from "./applyStateDecay"
import { applyThresholds } from "./applyThresholds"
import { applyTitleEffects } from "./applyTitleEffects"
import { applyNpcConsequences } from "./applyNpcConsequences"
import { applyPolitics } from "./applyPolitics"
import { applyNpcAgency } from "./applyNpcAgency"
import { applyNpcTraitDrift } from "./applyNpcTraitDrift"
import { checkNpcArcTransitions } from "./checkNpcArcTransitions"
import { applyFactionQuestBonus, applyFactionActivity } from "./applyFactionActivity"
import { applyRumorSpread } from "./applyRumorSpread"
import { tickWardStages } from "./houseWard"
import { applyPersonalityFriction } from './applyPersonalityFriction'

// Re-export for backwards compatibility — external consumers (e.g. ledger selector) import from here.
export { wageForStatus } from "./applyWages"

export function applyEndOfDayResources(state: GameState): GameState {
  let next = state

  // Low food security → extra hunger decay for all NPCs
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

  // Corridor status → food supply impact
  if (next.cityResources.corridorStatus === "blocked") {
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        foodSecurity: Math.max(0, next.cityResources.foodSecurity - 10),
      },
    }
    next = appendActivityLogEntry(
      next,
      "system",
      "The Green Corridor remains sealed. Food reserves dwindle.",
    )
  } else if (next.cityResources.corridorStatus === "disrupted") {
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        foodSecurity: Math.max(0, next.cityResources.foodSecurity - 3),
      },
    }
  }

  return next
}

function resolveRumorEvents(state: GameState, rng: Rng): GameState {
  const rumorPending = state.pendingEvents.filter((pe) => {
    const template = contentCatalog.eventsById.get(pe.eventId)
    return template?.isAutoResolved === true && template.tags.includes("rumor")
  })
  if (rumorPending.length === 0) return state

  const chosen = rumorPending[Math.floor(rng() * rumorPending.length)]!
  const template = contentCatalog.eventsById.get(chosen.eventId)!

  let next = appendActivityLogEntry(state, "system", `Rumor: ${template.description}`)
  next = {
    ...next,
    pendingEvents: next.pendingEvents.filter((pe) => pe.eventId !== chosen.eventId),
  }
  return next
}

/** Every 7 days held: condition steps down one tier. At 'broken': rescue difficulty rises. */
const CAPTIVITY_DEGRADATION_DAYS = 7
const CONDITION_PROGRESSION: CaptivityCondition[] = ['healthy', 'hurt', 'broken', 'altered']

function applyCaptivityDegradation(state: GameState): GameState {
  const hasCaptives = state.roster.some(
    (n) =>
      n.captivityState?.status === 'missing' || n.captivityState?.status === 'captive',
  )
  if (!hasCaptives) return state

  return {
    ...state,
    roster: state.roster.map((npc) => {
      const cap = npc.captivityState
      if (!cap || (cap.status !== 'missing' && cap.status !== 'captive')) return npc
      const newDays = cap.timeHeldDays + 1
      // High coercionRisk NPCs degrade at double speed (halved threshold)
      const risk = selectNpcCoercionRisk(npc)
      const threshold = risk > 0.6 ? Math.max(1, Math.floor(CAPTIVITY_DEGRADATION_DAYS / 2)) : CAPTIVITY_DEGRADATION_DAYS
      const shouldDegrade =
        newDays > 0 && newDays % threshold === 0
      const currentIdx = CONDITION_PROGRESSION.indexOf(cap.condition)
      const newCondition: CaptivityCondition =
        shouldDegrade && currentIdx < CONDITION_PROGRESSION.length - 1
          ? CONDITION_PROGRESSION[currentIdx + 1]!
          : cap.condition
      return {
        ...npc,
        captivityState: { ...cap, timeHeldDays: newDays, condition: newCondition },
      }
    }),
  }
}

function checkMainQuestProgression(state: GameState): GameState {
  const { stage } = state.mainQuest

  // location-known → rescued: completing quest-mira-rescue
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

export function endDay(state: GameState): GameState {
  const seeded = createRng(state.rngSeed)
  const rng = seeded.rng

  // Steps 1-4: wages, decay, thresholds, title effects + income
  let next = applyWages(state)
  next = applyStateDecay(next)
  next = applyThresholds(next)
  next = applyTitleEffects(next, rng)

  // Step 5: City resource consequences
  next = applyEndOfDayResources(next)

  // Steps 5b-5d: relationship drift, NPC departure, durability warnings
  // Passes original relationships so departure check uses start-of-day loyalty values.
  next = applyNpcConsequences(next, state.relationships, rng)

  // Step 6: Advance time
  const nextDay = next.day + 1
  next = { ...next, day: nextDay, timeSlot: "morning" }
  next = appendActivityLogEntry(next, "system", `The day turns. Day ${nextDay}.`)

  // Step 7: Politics, factions, debt
  next = applyPolitics(next, rng)

  // Step 8: Expire stale hire offers, optionally refresh, then evaluate world events
  const afterExpiry = expireHireOffers(next)
  let afterEvents: GameState
  if (nextDay % 3 === 0 && afterExpiry.currentDistrictId) {
    const refreshed: GameState = { ...afterExpiry, availableForHire: [...afterExpiry.availableForHire] }
    generateDistrictHireOffers(refreshed, afterExpiry.currentDistrictId, undefined, rng)
    afterEvents = evaluateEvents(refreshed, rng)
  } else {
    afterEvents = evaluateEvents(afterExpiry, rng)
  }

  // Step 9: Faction quest bonus, NPC agency, faction agenda, district tension
  afterEvents = applyFactionQuestBonus(afterEvents)
  afterEvents = applyNpcAgency(afterEvents, rng)
  afterEvents = applyFactionActivity(afterEvents)
  afterEvents = applyRumorSpread(afterEvents, rng)

  // Steps 9b-9c: Experiential trait drift and arc stage transitions
  afterEvents = applyNpcTraitDrift(afterEvents, rng)
  afterEvents = checkNpcArcTransitions(afterEvents, rng)

  // Step 9d: personality friction and bonding events (every 2 days)
  if (nextDay % 2 === 0) {
    afterEvents = applyPersonalityFriction(afterEvents, rng)
  }

  // Steps 10-12: Rumor events + captivity degradation + main quest progression
  afterEvents = resolveRumorEvents(afterEvents, rng)
  afterEvents = applyCaptivityDegradation(afterEvents)
  afterEvents = tickWardStages(afterEvents)
  const finalState = checkMainQuestProgression(afterEvents)

  // Store advanced RNG seed for next day's deterministic run
  return { ...finalState, rngSeed: seeded.getSeed() }
}
