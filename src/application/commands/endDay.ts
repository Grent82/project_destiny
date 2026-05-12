import type { GameState } from "../../domain"
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
import { applyFactionQuestBonus, applyFactionActivity } from "./applyFactionActivity"

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
    // Push unrest up if cityDials exists (added by destiny-suq)
    if ("cityDials" in next && next.cityDials != null) {
      const dials = next.cityDials as { unrest: number }
      next = {
        ...next,
        cityDials: { ...dials, unrest: Math.min(100, dials.unrest + 5) },
      } as GameState
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

  // Steps 10-11: Rumor events + main quest progression
  afterEvents = resolveRumorEvents(afterEvents, rng)
  const finalState = checkMainQuestProgression(afterEvents)

  // Store advanced RNG seed for next day's deterministic run
  return { ...finalState, rngSeed: seeded.getSeed() }
}
