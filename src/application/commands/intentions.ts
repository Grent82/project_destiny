import type { GameState, NpcIntention, NpcIntentionType } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { npcIntentionSchema } from '../../domain/npc/contracts'
import { generateNpcIntention } from './intentions/pipeline'
import { tryNpcNpcFlirtation, checkJealousyForNpc, tryNpcNpcSeekIntimacy, tryNpcNpcFlirtAggressively } from './npcNpcRomance'
import { tryAdvanceIntimacyStage } from './applyNpcPairing'
import { npcEatMeal, npcDrink, npcSleep, npcRest, npcGroom, npcMeditate } from './npcSurvivalActions'
import {
  npcConfrontRival,
  npcAssertDominance,
  npcProtectHouse,
  npcPatrolDistrict,
  npcFortifyPosition,
  npcCareForInjured,
} from './npcAggressionActions'
import { npcResourceGather, npcScavenge, npcSeekEmployment, npcHostGathering } from './npcSpecialActions'
import {
  npcConsolidatePower,
  npcChallengeAuthority,
  npcSocialize,
  npcGossip,
  npcMediateConflict,
} from './npcLeadershipActions'
import {
  npcSpyOn,
  npcGatherLeverage,
  npcInterceptCommunication,
  npcPeopleWatch,
  npcScoutAhead,
  npcInvestigateThreat,
  npcSeekShelter,
  npcPracticeSkill,
  npcTrainSelf,
  npcEscapeAttempt,
} from './npcIntellectActions'
import { createRng } from './seededRng'
import { intentionTypesForNpc } from './intentions/eligibility'
import { npcRepairEquipment, npcNeedsEquipmentRepair } from './economy/npcRepairEquipment'
import { npcUseConsumable, npcCanUseConsumable } from './economy/npcUseConsumable'
import { npcGiveGift, npcCanGiveGift } from './economy/npcGiveGift'
import { npcTradeWithNpc, npcCanTradeWithNpc } from './economy/npcTradeWithNpc'

/**
 * Guard conditions that prevent an NPC from forming an intention.
 * Returns true if the NPC is BLOCKED from having an intention.
 *
 * Priority order (highest to lowest):
 * 1. Player Assignment (deployed, working, defense, training)
 * 2. Faction Directive (active directive)
 * 3. Captivity/Ward status
 */
function isNpcBlockedFromIntention(npc: NpcRuntimeState): boolean {
  // Player assignment has highest priority - no personal intention while assigned
  if (npc.assignment !== 'idle') return true

  // Faction directive takes precedence over personal intention
  if (npc.currentDirectiveId !== null) return true

  // Ward NPCs cannot form personal intentions
  if (npc.status === 'ward') return true

  // NPCs in captivity cannot form personal intentions (checked via captivityState)
  if (npc.captivityState?.status === 'captive') return true

  return false
}

/**
 * Calculates the confidence level (0-100) for an NPC to succeed at an intention type.
 * Based on relevant attributes, skills, and traits.
 */
function calculateIntentionConfidence(npc: NpcRuntimeState, intentionType: NpcIntentionType): number {
  let confidence = 50 // Base confidence

  switch (intentionType) {
    case 'lead-group':
      // Leadership requires presence, ambition, and discipline
      confidence += (npc.attributes.presence - 50) / 2
      confidence += (npc.traits.ambition - 50) / 3
      confidence += (npc.traits.discipline - 50) / 3
      break

    case 'support-group':
      // Support requires empathy, loyalty, and administration
      confidence += (npc.traits.empathy - 50) / 3
      confidence += (npc.traits.loyalty - 50) / 3
      confidence += (npc.skills.administration - 50) / 4
      break

    case 'scout-ahead':
      // Scouting requires perception, survival, and curiosity
      confidence += (npc.attributes.perception - 50) / 2
      confidence += (npc.skills.survival - 50) / 4
      confidence += (npc.traits.curiosity - 50) / 4
      break

    case 'resource-gather':
      // Gathering requires survival, endurance, and prudence
      confidence += (npc.skills.survival - 50) / 4
      confidence += (npc.attributes.endurance - 50) / 3
      confidence += (npc.traits.prudence - 50) / 4
      break

    case 'confront-rival':
      // Confrontation requires might, melee, and ruthlessness
      confidence += (npc.attributes.might - 50) / 2
      confidence += (npc.skills.melee - 50) / 4
      confidence += (npc.traits.ruthlessness - 50) / 4
      break

    case 'protect-house':
      // Protection requires endurance, discipline, and loyalty
      confidence += (npc.attributes.endurance - 50) / 2
      confidence += (npc.traits.discipline - 50) / 3
      confidence += (npc.traits.loyalty - 50) / 3
      break

    case 'investigate-threat':
      // Investigation requires intellect, intrigue, and curiosity
      confidence += (npc.attributes.intellect - 50) / 2
      confidence += (npc.skills.intrigue - 50) / 4
      confidence += (npc.traits.curiosity - 50) / 4
      break

    case 'patrol-district':
      // Patrol requires endurance, survival, and perception
      confidence += (npc.attributes.endurance - 50) / 3
      confidence += (npc.skills.survival - 40) / 4
      confidence += (npc.attributes.perception - 50) / 3
      break

    case 'seek-employment':
      // Seeking employment requires negotiation and ambition
      confidence += (npc.skills.negotiation - 50) / 4
      confidence += (npc.traits.ambition - 50) / 4
      break

    case 'socialize':
      // Socializing requires presence, empathy, and performance
      confidence += (npc.attributes.presence - 50) / 3
      confidence += (npc.traits.empathy - 50) / 3
      confidence += (npc.skills.performance - 50) / 4
      break
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(confidence)))
}

/**
 * Determines the urgency (1-7 days) based on intention type and world state.
 */
function calculateUrgencyDays(intentionType: NpcIntentionType, state: GameState): number {
  // Base urgency by intention type
  const baseUrgency: Record<NpcIntentionType, number> = {
    // Original 10 types
    'lead-group': 5,
    'support-group': 4,
    'scout-ahead': 3,
    'resource-gather': 4,
    'confront-rival': 2,
    'protect-house': 3,
    'investigate-threat': 3,
    'patrol-district': 5,
    'seek-employment': 6,
    'socialize': 7,
    // Basis-Bedürfnisse (5) - hohe Dringlichkeit bei Bedarf
    'eat-meal': 1,
    'drink': 1,
    'sleep': 1,
    'rest': 2,
    'groom': 3,
    // Sozial/Romantik (5)
    'flirt-with': 5,
    'court-romantically': 6,
    'visit-lover': 4,
    'jealousy-check': 2,
    'spend-time-with': 5,
    // Romantik/Sexualität (3)
    'seek-intimacy': 4,
    'flirt-aggressively': 3,
    'visit-romantic-partner': 4,
    // Alltagsaktivitäten (4)
    'shop-for-goods': 4,
    'train-self': 6,
    'meditate': 3,
    'practice-skill': 5,
    // Spezial/Quirky (2)
    'people-watch': 7,
    'gossip': 6,
    // Geld verdienen (4)
    'seek-tips': 3,
    'black-market-trade': 2,
    'beg-for-coin': 1,
    'scavenge-for-sell': 3,
    // NPC Economy (destiny-bkln)
    'repair-equipment': 3,
    'use-consumable': 1,
    'give-gift': 6,
    'trade-with-npc': 4,
    // Macht/Kontrolle (5)
    'assert-dominance': 3,
    'spy-on': 2,
    'intercept-communication': 2,
    'gather-leverage': 3,
    'consolidate-power': 4,
    // Gruppen/Dynamik (5)
    'form-squad': 4,
    'recruit-member': 5,
    'host-gathering': 6,
    'mediate-conflict': 2,
    'challenge-authority': 3,
    // Überleben/Existenz (5)
    'scavenge': 3,
    'fortify-position': 2,
    'escape-attempt': 1,
    'seek-shelter': 1,
    'care-for-injured': 2,
  }

  let urgency = baseUrgency[intentionType]

  // Adjust based on world state
  if (intentionType === 'confront-rival') {
    // More urgent if district tension is high
    const currentDistrict = state.currentDistrictId
    if (currentDistrict) {
      const tension = state.districtTension[currentDistrict] ?? 50
      if (tension > 70) urgency = Math.max(1, urgency - 2)
      if (tension > 85) urgency = Math.max(1, urgency - 1)
    }
  }

  if (intentionType === 'resource-gather') {
    // More urgent if food security is low
    if (state.cityResources.foodSecurity < 40) urgency = Math.max(2, urgency - 1)
  }

  return Math.max(1, Math.min(7, urgency))
}

/**
 * Determines the priority (1-5) for an intention based on NPC traits and world state.
 */
function calculateIntentionPriority(npc: NpcRuntimeState, intentionType: NpcIntentionType, state: GameState): number {
  let priority = 3 // Base priority

  // Trait-based priority adjustments
  switch (intentionType) {
    case 'lead-group':
      if (npc.traits.ambition >= 70) priority += 1
      if (npc.traits.dominance >= 60) priority += 1
      break

    case 'protect-house':
      if (npc.traits.loyalty >= 70) priority += 1
      if (npc.traits.discipline >= 60) priority += 1
      break

    case 'confront-rival':
      if (npc.traits.ruthlessness >= 60) priority += 1
      if (npc.traits.dominance >= 50) priority += 1
      break

    case 'investigate-threat':
      if (npc.traits.curiosity >= 60) priority += 1
      if (npc.attributes.intellect >= 60) priority += 1
      break
  }

  // World state adjustments
  if (state.cityResources.corridorStatus === 'blocked' && intentionType === 'lead-group') {
    priority += 1
  }

  if (state.cityResources.foodSecurity < 30 && intentionType === 'resource-gather') {
    priority += 1
  }

  return Math.max(1, Math.min(5, priority))
}

/**
 * Calculates an NPC's personal intention if they are free to act.
 *
 * Guard conditions (must ALL pass):
 * 1. NPC assignment must be 'idle'
 * 2. NPC must not have an active faction directive
 * 3. NPC status must not be 'captive' or 'ward'
 *
 * If guards pass, uses the 5-stage pipeline to determine:
 * - Intention type from state/personality/trait/relationship/urgency
 * - Priority based on traits and urgency
 * - Confidence from ML weights and fuzzy logic
 * - Urgency based on intention type and world conditions
 */
export function calculateNpcIntention(state: GameState, npcId: string): NpcIntention | null {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return null

  // Check guard conditions
  if (isNpcBlockedFromIntention(npc)) return null

  // Use the new 5-stage pipeline to determine intention type
  const intentionType = generateNpcIntention(state, npc)
  if (!intentionType) return null

  // Calculate intention parameters (legacy functions still work for priority/confidence/urgency)
  const priority = calculateIntentionPriority(npc, intentionType, state)
  const confidence = calculateIntentionConfidence(npc, intentionType)
  const urgencyDays = calculateUrgencyDays(intentionType, state)

  const intention: NpcIntention = {
    type: intentionType,
    targetId: state.currentDistrictId ?? 'district-the-pale',
    targetType: 'district',
    priority,
    urgencyDays,
    confidence,
    createdAtDay: state.day,
    expiresAtDay: state.day + urgencyDays,
    validTimeSlots: ['morning', 'afternoon', 'evening', 'night'],
  }

  // Validate the schema before returning
  const parsed = npcIntentionSchema.safeParse(intention)
  if (!parsed.success) return null

  return parsed.data
}

/**
 * Processes all roster NPCs and assigns intentions to those who are free to act.
 * Called during the personality/agency phase of endDay.
 */
export function processNpcIntentions(state: GameState): GameState {
  let newState = state

  for (const npc of state.npcRuntimeStates) {
    // Skip NPCs who already have an intention or directive
    if (npc.currentIntention) continue
    if (npc.currentDirectiveId) continue

    // Calculate intention for idle NPCs
    const intention = calculateNpcIntention(newState, npc.npcId)
    if (intention) {
      newState = {
        ...newState,
        npcRuntimeStates: newState.npcRuntimeStates.map((n) =>
          n.npcId === npc.npcId ? { ...n, currentIntention: intention } : n,
        ),
      }
    }
  }

  return newState
}

/**
 * Clears an NPC's intention (called when they start a directive or assignment).
 */
export function clearNpcIntention(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc || !npc.currentIntention) return state

  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId ? { ...n, currentIntention: null } : n,
    ),
  }
}

/**
 * Intention types wired into endDay. destiny-7ekd/destiny-mbju originally allowlisted only
 * visit-lover/spend-time-with, excluding flirt-with/court-romantically/jealousy-check because
 * they duplicated blanket-sweep systems. Those three were redesigned (not re-duplicated) to route
 * through the same canonical mechanics the blanket sweeps used (tryNpcNpcFlirtation,
 * tryAdvanceIntimacyStage, checkJealousyForNpc with a proper RNG gate) and are now wired here too.
 * seek-intimacy/flirt-aggressively (destiny-1xd5/rq8u) are genuinely new, non-duplicate mechanics
 * (verified against applyHouseholdIntimacy.ts and engagePhysicalIntimacy.ts) added the same way.
 * visit-romantic-partner is a distinct pipeline candidate (its own weight entries in pipeline.ts
 * and mlWeights.ts) that resolves to the same visitLoverHandler as visit-lover in the registry —
 * without being in this allowlist too, that candidate could never actually fire even though the
 * registry looks wired for it.
 * The 4 money-earning types (destiny-w29v/n42o/wtpx/4msw) are complete, tested commands in
 * intentions/moneyEarning/ that were already being called by applyMoneyEarningIntentions
 * (handleSocialSimulationPhase.ts) — but were never fed a currentIntention to react to. Verified
 * non-duplicate against npcAgency/spendingAgency.ts (opposite direction: house money, working
 * NPCs only), applyWages.ts (working/assigned_title only, never idle), and houseSearch.ts
 * (player-initiated, house items, not NPC personal funds). Their registry entries stay mapped to
 * careForInjuredHandler (a harmless no-op) since the real execution path is
 * applyMoneyEarningIntentions, which now also clears the intention itself once resolved.
 * The 5 Survival types (destiny-rjwy: eat-meal/drink/sleep/rest/groom) plus meditate are real,
 * non-duplicate implementations in npcSurvivalActions.ts. Verified non-duplicate against
 * applyStateDecay.ts, which only accumulates hunger/fatigue/hygiene passively (and gives a small
 * kitchen/quarters bonus) — these commands are the NPC's own active resolution of those needs,
 * not a second copy of the passive decay. groom's hygiene direction was found inverted in both
 * the generation pipeline and this handler's guard (hygiene is a dirtiness measure — see
 * applyStateDecay.ts's HYGIENE_PENALTY_THRESHOLD — not a cleanliness one) and was fixed alongside
 * the real implementation.
 * The 6 Aggression & Defense types (destiny-kuw0) are real implementations in
 * npcAggressionActions.ts. confront-rival reads authored rival loyalties (npcs.json) rather than
 * inventing a new rivalry concept; protect-house/patrol-district ease districtTension (house's own
 * district vs. the NPC's assignedDistrictId, respectively) rather than duplicating any existing
 * mechanic — nothing else currently reduces district tension this way; fortify-position reuses the
 * player's existing house.fortificationLevel field (already read by siteRuntime.ts/house.ts's
 * defense selectors) instead of inventing a parallel one. care-for-injured's registry entry
 * (careForInjuredHandler) previously stood in as a generic placeholder for many other still-unbuilt
 * types and for the money-earning types below — giving it real logic is safe because 'care-for-
 * injured' itself was never in this allowlist until now, and the money-earning types are always
 * cleared (see below) before their execute() would ever run.
 * All other placeholder handlers stay excluded — see destiny-7ekd's classification.
 */
export const WIRED_INTENTION_TYPES = new Set<NpcIntentionType>([
  'visit-lover',
  'visit-romantic-partner',
  'spend-time-with',
  'flirt-with',
  'court-romantically',
  'jealousy-check',
  'seek-intimacy',
  'flirt-aggressively',
  'seek-tips',
  'black-market-trade',
  'beg-for-coin',
  'scavenge-for-sell',
  'eat-meal',
  'drink',
  'sleep',
  'rest',
  'groom',
  'meditate',
  'confront-rival',
  'assert-dominance',
  'protect-house',
  'patrol-district',
  'fortify-position',
  'care-for-injured',
  // destiny-ddqf (Special Actions): shop-for-goods stays excluded (blocked pending
  // destiny-su15.3/su15.4 per its own bead notes); recruit-member stays excluded (no NPC
  // group/squad runtime concept exists — see lead-group/support-group/form-squad below).
  'resource-gather',
  'scavenge',
  'seek-employment',
  'host-gathering',
  // destiny-l2ex (Leadership & Social): lead-group/support-group stay excluded — same
  // missing-group-system gap as recruit-member/form-squad.
  'consolidate-power',
  'socialize',
  'gossip',
  'mediate-conflict',
  'challenge-authority',
  // destiny-aoy7 (Intellect & Stealth): form-squad stays excluded (missing-group-system gap).
  // escape-attempt stays excluded — isNpcBlockedFromIntention() unconditionally blocks captive
  // NPCs from any intention, so it's structurally unreachable via this pipeline today even
  // though npcEscapeAttempt itself is implemented and tested; unblocking it needs a deliberate
  // carve-out in that guard, not a silent inclusion here.
  'spy-on',
  'gather-leverage',
  'intercept-communication',
  'people-watch',
  'scout-ahead',
  'investigate-threat',
  'seek-shelter',
  'practice-skill',
  'train-self',
  // destiny-bkln (NPC Economy): repair-equipment. Roster-only (see intentions/eligibility.ts —
  // deliberately absent from WORLD_ELIGIBLE_INTENTION_TYPES, matching seek-employment/seek-tips'
  // existing precedent: this is a roster-personalFunds economy action, not a world-NPC one).
  'repair-equipment',
  'use-consumable',
  'give-gift',
  'trade-with-npc',
])

/**
 * Generation, gated to the wired allowlist AND per-person eligibility.
 *
 * calculateNpcIntention/generateNpcIntention can produce any of ~47 intention types, including
 * money-earning ones that applyMoneyEarningIntentions (already called from
 * handleSocialSimulationPhase) is waiting to react to. Writing an unrestricted intention here
 * would silently reactivate that system too — well outside this bead's "exactly 2 handlers"
 * scope. Any computed type outside the allowlist is discarded rather than written to state.
 *
 * destiny-rama.10: this loop already iterated `state.npcRuntimeStates` (the C1 rename made that
 * automatic — world/story/captive persons share the list since C2/C3), but it only ever checked
 * `WIRED_INTENTION_TYPES`, never `intentionTypesForNpc(npc)` (destiny-rama.5's positive eligibility
 * set) — meaning a world NPC could already be assigned e.g. 'fortify-position' or 'seek-employment'
 * (both wired, house/player-economy mechanics) purely because nothing intersected the allowlist
 * with what that person's *kind* is even eligible to want. Composing both gates here is what
 * actually makes npcType-based eligibility real, not just an unused helper function.
 * isNpcBlockedFromIntention (inside calculateNpcIntention) remains the hard runtime block —
 * intentionTypesForNpc is defense-in-depth on top of it, not a replacement.
 */
export function processAllowlistedNpcIntentions(state: GameState): GameState {
  let next = state

  for (const npc of state.npcRuntimeStates) {
    if (npc.currentIntention) continue
    if (npc.currentDirectiveId) continue

    const intention = calculateNpcIntention(next, npc.npcId)
    if (!intention) continue
    if (!WIRED_INTENTION_TYPES.has(intention.type)) continue
    if (!intentionTypesForNpc(npc).has(intention.type)) continue

    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((n) =>
        n.npcId === npc.npcId ? { ...n, currentIntention: intention } : n,
      ),
    }
  }

  return next
}

/**
 * Execution, gated to the wired allowlist, clearing the intention afterward so the NPC can
 * generate a new one on a later day.
 */
export function executeAllowlistedNpcIntentions(state: GameState): GameState {
  let next = state

  for (const npc of next.npcRuntimeStates) {
    if (!npc.currentIntention || !WIRED_INTENTION_TYPES.has(npc.currentIntention.type)) continue

    next = executeNpcIntention(npc, next)
    next = clearNpcIntention(next, npc.npcId)
  }

  return next
}

/**
 * Intention Handler Interface
 * Each handler implements the logic for executing a specific intention type.
 * All handlers must check guards first (assignment !== 'idle' or currentDirectiveId !== null).
 */
interface IntentionHandler {
  canExecute: (npc: NpcRuntimeState, state: GameState) => boolean
  execute: (npc: NpcRuntimeState, state: GameState) => GameState
}

/**
 * Base guard check for all intention handlers.
 * Returns true if the NPC can execute an intention (idle + no directive).
 */
function canExecuteIntention(npc: NpcRuntimeState): boolean {
  // Player assignment takes priority - no intention execution
  if (npc.assignment !== 'idle') return false

  // Faction directive takes priority over personal intention
  if (npc.currentDirectiveId !== null) return false

  return true
}

/**
 * Lead Group Handler
 * NPC attempts to form or lead a group (e.g., for corridor clearance).
 */
const leadGroupHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires high presence and ambition
    return npc.attributes.presence >= 60 && npc.traits.ambition >= 50
  },
  execute: (_npc, state) => {
    // For now, this is a placeholder - actual group logic would go here
    // In a full implementation, this would:
    // - Check if a group already exists
    // - Recruit other NPCs to join
    // - Start a group expedition
    return state
  },
}

/**
 * Support Group Handler
 * NPC joins an existing group as support.
 */
const supportGroupHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires empathy and loyalty
    return npc.traits.empathy >= 40 || npc.traits.loyalty >= 50
  },
  execute: (_npc, state) => {
    // Placeholder - would join existing group
    return state
  },
}

/**
 * Scout Ahead Handler
 * NPC scouts ahead to gather intelligence.
 */
const scoutAheadHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires perception and survival
    return npc.attributes.perception >= 50 || npc.skills.survival >= 40
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcScoutAhead(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Resource Gather Handler
 * NPC gathers resources (food, materials).
 */
const resourceGatherHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires survival skill
    return npc.skills.survival >= 40 || npc.attributes.endurance >= 50
  },
  execute: (npc, state) => npcResourceGather(state, npc.npcId),
}

/**
 * Confront Rival Handler
 * NPC confronts a rival NPC or faction member.
 */
const confrontRivalHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires might and ruthlessness
    return npc.attributes.might >= 50 || npc.traits.ruthlessness >= 50
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcConfrontRival(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Protect House Handler
 * NPC guards the player's house.
 */
const protectHouseHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires loyalty and discipline
    return npc.traits.loyalty >= 50 || npc.traits.discipline >= 50
  },
  execute: (npc, state) => npcProtectHouse(state, npc.npcId),
}

/**
 * Investigate Threat Handler
 * NPC investigates a potential threat.
 */
const investigateThreatHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires intellect and intrigue
    return npc.attributes.intellect >= 50 || npc.skills.intrigue >= 40
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcInvestigateThreat(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Patrol District Handler
 * NPC patrols their assigned district.
 */
const patrolDistrictHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires endurance and survival
    return npc.attributes.endurance >= 40 || npc.skills.survival >= 30
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcPatrolDistrict(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Seek Employment Handler
 * NPC looks for work if unemployed.
 */
const seekEmploymentHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires negotiation skill
    return npc.skills.negotiation >= 30 || npc.traits.ambition >= 40
  },
  execute: (npc, state) => npcSeekEmployment(state, npc.npcId),
}

/**
 * Socialize Handler
 * NPC socializes with other NPCs.
 */
const socializeHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires presence and empathy
    return npc.attributes.presence >= 40 || npc.traits.empathy >= 40
  },
  execute: (npc, state) => npcSocialize(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basis-Bedürfnisse (5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Eat Meal Handler
 * NPC eats a meal to reduce hunger.
 */
const eatMealHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires hunger > 40 or basic survival skill
    return npc.states.hunger > 40 || npc.skills.survival >= 20
  },
  execute: (npc, state) => npcEatMeal(state, npc.npcId),
}

/**
 * Drink Handler
 * NPC drinks to quench thirst, possibly at a tavern.
 */
const drinkHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Social drinking requires presence
    return npc.states.hunger > 30 || npc.attributes.presence >= 30
  },
  execute: (npc, state) => npcDrink(state, npc.npcId),
}

/**
 * Sleep Handler
 * NPC sleeps to reduce fatigue.
 */
const sleepHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires high fatigue
    return npc.states.fatigue > 60
  },
  execute: (npc, state) => npcSleep(state, npc.npcId),
}

/**
 * Rest Handler
 * NPC rests for active recovery (lighter than sleep).
 */
const restHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires moderate fatigue
    return npc.states.fatigue > 40 && npc.states.fatigue <= 60
  },
  execute: (npc, state) => npcRest(state, npc.npcId),
}

/**
 * Groom Handler
 * NPC improves hygiene, satisfies vanity.
 */
const groomHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires accumulated grime (hygiene is a dirtiness measure, not cleanliness — see
    // applyStateDecay.ts's HYGIENE_PENALTY_THRESHOLD) or high vanity
    return npc.states.hygiene > 60 || npc.traits.vanity >= 60
  },
  execute: (npc, state) => npcGroom(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sozial/Romantik (5 real handlers, all intention-driven)
//
// Earlier (2026-07-03) flirt-with/court-romantically/jealousy-check were removed
// (destiny-fb6z/jdft/2xyp) because they duplicated blanket-sweep systems
// (simulateNpcNpcRomance, applyNpcPairing) that ran unconditionally over every
// pair/triplet daily. Per explicit user direction, redesigned as the architecturally
// better alternative: romance is now genuinely intention-driven — each NPC's daily
// Intention decides whether flirting/courting/jealousy is what THAT NPC is motivated
// to do, competing against eat/sleep/work, with exactly one canonical handler per
// mechanic. The blanket sweeps are gone (simulateNpcNpcRomance deleted); world-involving
// pairs (which can't hold an Intention) still advance via applyNpcPairing's remaining
// blanket path for stage progression only.
//
// destiny-rama.9: target-candidate filtering below uses !isNpcBlockedFromIntention(r) instead of
// a bare r.assignment === 'idle' check. World/story/captive persons now share npcRuntimeStates with
// roster NPCs, so a plain idle check would let a roster NPC's daily romance intention target a
// captive (e.g. Mira, whose hydrated entry defaults to assignment:'idle') or a ward - the same
// hard captivity/ward/directive block already enforced for the ACTING npc must also gate who can
// be a valid TARGET of that action. This intentionally does NOT restrict to playerRosterMember -
// world NPCs remain valid romance/social targets by design (per the unify epic's full-parity goal).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flirt With Handler
 * NPC flirts with a specific NPC (affinity/trait-based success roll).
 */
const flirtWithHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    return npc.attributes.presence >= 40 || npc.traits.empathy >= 40
  },
  execute: (npc, state) => {
    const targetEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]?.affinity ?? 0
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]?.affinity ?? 0
        return relB - relA
      })[0]

    if (!targetEntry) return state

    const rng = createRng(state.rngSeed)
    const newState = tryNpcNpcFlirtation(state, npc.npcId, targetEntry.npcId, rng.rng)

    return { ...newState, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Court Romantically Handler
 * NPC makes a romantic advance — tries to advance shared intimacy stage with a target,
 * via applyNpcPairing.ts's canonical, cooldown-gated tryAdvanceIntimacyStage.
 */
const courtRomanticallyHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    return npc.attributes.presence >= 50 && npc.traits.empathy >= 50
  },
  execute: (npc, state) => {
    const targetEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]
        const scoreA = (relA?.affinity ?? 0) + (relA?.trust ?? 0)
        const scoreB = (relB?.affinity ?? 0) + (relB?.trust ?? 0)
        return scoreB - scoreA
      })[0]

    if (!targetEntry) return state

    return tryAdvanceIntimacyStage(state, npc, targetEntry, state.house.npcPairingPolicy)
  },
}

/**
 * Jealousy Check Handler
 * NPC checks for rivalry/jealousy situations relative to itself, RNG-gated per rival.
 */
const jealousyCheckHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    return npc.attributes.perception >= 40 || npc.traits.vanity >= 50
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const newState = checkJealousyForNpc(state, npc.npcId, rng.rng)

    return { ...newState, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Visit Lover Handler
 * NPC visits their romantic partner.
 */
const visitLoverHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires existing romantic relationship
    return npc.traits.empathy >= 40 || npc.traits.loyalty >= 50
  },
  execute: (npc, state) => {
    // Find romantic partner (highest intimacy stage)
    const partnerEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]?.intimacyStage ?? 'none'
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]?.intimacyStage ?? 'none'
        const stages = ['none', 'affinity', 'attachment', 'committed']
        return stages.indexOf(relB) - stages.indexOf(relA)
      })[0]

    if (!partnerEntry) return state

    // For now, just apply a small affinity boost (could be expanded to travel logic)
    const key = `${npc.npcId}-to-${partnerEntry.npcId}`
    const reverseKey = `${partnerEntry.npcId}-to-${npc.npcId}`
    const rel = state.relationships[key] ?? { affinity: 0, trust: 0, respect: 0, fear: 0, loyalty: 0 }
    const reverseRel = state.relationships[reverseKey] ?? { affinity: 0, trust: 0, respect: 0, fear: 0, loyalty: 0 }

    return {
      ...state,
      relationships: {
        ...state.relationships,
        [key]: { ...rel, affinity: Math.min(100, rel.affinity + 1) },
        [reverseKey]: { ...reverseRel, affinity: Math.min(100, reverseRel.affinity + 1) },
      },
    }
  },
}

/**
 * Spend Time With Handler
 * NPC spends time with family/friends.
 */
const spendTimeWithHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires empathy or loyalty
    return npc.traits.empathy >= 40 || npc.traits.loyalty >= 40
  },
  execute: (npc, state) => {
    // Find a friend/companion to spend time with (high affinity, any intimacy stage)
    const targetEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]?.affinity ?? 0
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]?.affinity ?? 0
        return relB - relA
      })[0]

    if (!targetEntry) return state

    // Small affinity and trust boost
    const key = `${npc.npcId}-to-${targetEntry.npcId}`
    const reverseKey = `${targetEntry.npcId}-to-${npc.npcId}`
    const rel = state.relationships[key] ?? { affinity: 0, trust: 0, respect: 0, fear: 0, loyalty: 0 }
    const reverseRel = state.relationships[reverseKey] ?? { affinity: 0, trust: 0, respect: 0, fear: 0, loyalty: 0 }

    return {
      ...state,
      relationships: {
        ...state.relationships,
        [key]: {
          ...rel,
          affinity: Math.min(100, rel.affinity + 1),
          trust: Math.min(100, (rel.trust ?? 0) + 1),
        },
        [reverseKey]: {
          ...reverseRel,
          affinity: Math.min(100, reverseRel.affinity + 1),
        },
      },
    }
  },
}

/**
 * Seek Intimacy Handler
 * NPC seeks a quiet, consensual intimate moment with a deeply trusted partner.
 */
const seekIntimacyHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    return npc.traits.empathy >= 40 || npc.traits.loyalty >= 50
  },
  execute: (npc, state) => {
    // Find the most trusted idle partner (deep-trust gate is enforced inside tryNpcNpcSeekIntimacy)
    const targetEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]?.trust ?? 0
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]?.trust ?? 0
        return relB - relA
      })[0]

    if (!targetEntry) return state

    const rng = createRng(state.rngSeed)
    const newState = tryNpcNpcSeekIntimacy(state, npc.npcId, targetEntry.npcId, rng.rng)

    return { ...newState, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Flirt Aggressively Handler
 * NPC makes a bold, high-risk romantic advance.
 */
const flirtAggressivelyHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    return npc.traits.dominance >= 50
  },
  execute: (npc, state) => {
    const targetEntry = state.npcRuntimeStates
      .filter((r) => r.npcId !== npc.npcId && !isNpcBlockedFromIntention(r))
      .sort((a, b) => {
        const relA = state.relationships[`${npc.npcId}-to-${a.npcId}`]?.affinity ?? 0
        const relB = state.relationships[`${npc.npcId}-to-${b.npcId}`]?.affinity ?? 0
        return relB - relA
      })[0]

    if (!targetEntry) return state

    const rng = createRng(state.rngSeed)
    const newState = tryNpcNpcFlirtAggressively(state, npc.npcId, targetEntry.npcId, rng.rng)

    return { ...newState, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Alltagsaktivitäten (4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shop For Goods Handler
 * NPC shops for items/resources.
 */
const shopForGoodsHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires negotiation or administration
    return npc.skills.negotiation >= 30 || npc.skills.administration >= 30
  },
  execute: (_npc, state) => {
    // Placeholder - would visit shop, potentially buy items
    return state
  },
}

/**
 * Train Self Handler
 * NPC trains to improve skills.
 */
const trainSelfHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires discipline or ambition
    return npc.traits.discipline >= 40 || npc.traits.ambition >= 50
  },
  execute: (npc, state) => npcTrainSelf(state, npc.npcId),
}

/**
 * Meditate Handler
 * NPC meditates to reduce stress, strengthen resolve.
 */
const meditateHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires high stress or high intellect
    return npc.states.stress > 50 || npc.attributes.intellect >= 50
  },
  execute: (npc, state) => npcMeditate(state, npc.npcId),
}

/**
 * Practice Skill Handler
 * NPC practices a specific skill.
 */
const practiceSkillHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires curiosity or discipline
    return npc.traits.curiosity >= 40 || npc.traits.discipline >= 40
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcPracticeSkill(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Spezial/Quirky (2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * People Watch Handler
 * NPC observes others (Perception, Intrigue).
 */
const peopleWatchHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires perception and curiosity
    return npc.attributes.perception >= 40 || npc.traits.curiosity >= 40
  },
  execute: (npc, state) => npcPeopleWatch(state, npc.npcId),
}

/**
 * Gossip Handler
 * NPC gathers/spreads rumors.
 */
const gossipHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires performance or intrigue
    return npc.skills.performance >= 40 || npc.skills.intrigue >= 40
  },
  execute: (npc, state) => npcGossip(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// Macht/Kontrolle (5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert Dominance Handler
 * NPC shows dominance (Dominance Trait).
 */
const assertDominanceHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires high dominance
    return npc.traits.dominance >= 60
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcAssertDominance(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Spy On Handler
 * NPC spies on someone (Intrigue + Stealth).
 */
const spyOnHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires intrigue and curiosity
    return npc.skills.intrigue >= 50 || npc.traits.curiosity >= 60
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcSpyOn(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Intercept Communication Handler
 * NPC intercepts letters/messages.
 */
const interceptCommunicationHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires intrigue and prudence
    return npc.skills.intrigue >= 50 || npc.traits.prudence >= 50
  },
  execute: (npc, state) => npcInterceptCommunication(state, npc.npcId),
}

/**
 * Gather Leverage Handler
 * NPC gathers leverage against someone.
 */
const gatherLeverageHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires intrigue and ruthlessness
    return npc.skills.intrigue >= 40 || npc.traits.ruthlessness >= 50
  },
  execute: (npc, state) => npcGatherLeverage(state, npc.npcId),
}

/**
 * Consolidate Power Handler
 * NPC consolidates power in a district.
 */
const consolidatePowerHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires presence and ambition
    return npc.attributes.presence >= 50 && npc.traits.ambition >= 60
  },
  execute: (npc, state) => npcConsolidatePower(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// Gruppen/Dynamik (5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Form Squad Handler
 * NPC forms a group for joint action.
 */
const formSquadHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires presence and leadership traits
    return npc.attributes.presence >= 50 || npc.traits.ambition >= 50
  },
  execute: (_npc, state) => {
    // Placeholder - would form squad with other NPCs
    return state
  },
}

/**
 * Recruit Member Handler
 * NPC recruits new members for their group.
 */
const recruitMemberHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires negotiation and presence
    return npc.skills.negotiation >= 40 || npc.attributes.presence >= 40
  },
  execute: (_npc, state) => {
    // Placeholder - would recruit target NPC
    return state
  },
}

/**
 * Host Gathering Handler
 * NPC organizes an event/gathering.
 */
const hostGatheringHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires performance and presence
    return npc.skills.performance >= 50 || npc.attributes.presence >= 50
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcHostGathering(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Mediate Conflict Handler
 * NPC mediates a dispute (Empathy + Negotiation).
 */
const mediateConflictHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires empathy and negotiation
    return npc.traits.empathy >= 50 && npc.skills.negotiation >= 40
  },
  execute: (npc, state) => npcMediateConflict(state, npc.npcId),
}

/**
 * Challenge Authority Handler
 * NPC challenges authority figures.
 */
const challengeAuthorityHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires dominance and ruthlessness
    return npc.traits.dominance >= 50 || npc.traits.ruthlessness >= 50
  },
  execute: (npc, state) => npcChallengeAuthority(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// Überleben/Existenz (5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scavenge Handler
 * NPC scavenges for useful items (Survival).
 */
const scavengeHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires survival skill
    return npc.skills.survival >= 40
  },
  execute: (npc, state) => npcScavenge(state, npc.npcId),
}

/**
 * Fortify Position Handler
 * NPC fortifies a position (Security + Engineering).
 */
const fortifyPositionHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires security or engineering
    return npc.skills.security >= 40 || npc.skills.engineering >= 40
  },
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcFortifyPosition(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Escape Attempt Handler
 * Captive NPC attempts to escape.
 */
const escapeAttemptHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires captivity and high agility/perception
    if (npc.captivityState?.status !== 'captive') return false
    return npc.attributes.agility >= 50 || npc.attributes.perception >= 50
  },
  // npcEscapeAttempt is implemented and tested (see npcIntellectActions.ts), but 'escape-attempt'
  // is deliberately NOT in WIRED_INTENTION_TYPES — isNpcBlockedFromIntention() unconditionally
  // blocks captive NPCs from ANY intention, so this can never actually be generated/executed via
  // the normal pipeline today. Wired here anyway so it's correct and ready once that guard is
  // revisited, without silently reactivating anything (the allowlist gate still blocks it).
  execute: (npc, state) => {
    const rng = createRng(state.rngSeed)
    const next = npcEscapeAttempt(state, npc.npcId, rng.rng)
    return { ...next, rngSeed: rng.getSeed?.() ?? state.rngSeed }
  },
}

/**
 * Seek Shelter Handler
 * NPC seeks shelter (danger/weather).
 */
const seekShelterHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires prudence or high stress
    return npc.traits.prudence >= 50 || npc.states.stress > 60
  },
  execute: (npc, state) => npcSeekShelter(state, npc.npcId),
}

/**
 * Care For Injured Handler
 * NPC cares for injured (Medicine + Empathy).
 */
const careForInjuredHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires medicine and empathy
    return npc.skills.medicine >= 40 || npc.traits.empathy >= 50
  },
  execute: (npc, state) => npcCareForInjured(state, npc.npcId),
}

/**
 * Repair Equipment Handler (destiny-bkln)
 * NPC repairs their own damaged weapon/armor — materials-or-personalFunds, skill-gated success.
 */
const repairEquipmentHandler: IntentionHandler = {
  canExecute: (npc, state) => {
    if (!canExecuteIntention(npc)) return false
    if (!npc.playerRosterMember) return false
    return npcNeedsEquipmentRepair(state, npc)
  },
  execute: (npc, state) => npcRepairEquipment(state, npc.npcId),
}

/**
 * Use Consumable Handler (destiny-bkln)
 * NPC uses a self-carried medkit/ration to address low health or high hunger.
 */
const useConsumableHandler: IntentionHandler = {
  canExecute: (npc, state) => {
    if (!canExecuteIntention(npc)) return false
    if (!npc.playerRosterMember) return false
    return npcCanUseConsumable(state, npc)
  },
  execute: (npc, state) => npcUseConsumable(state, npc.npcId),
}

/**
 * Give Gift Handler (destiny-bkln)
 * NPC gives a gift item from their own inventory to the co-located roster NPC they like most.
 */
const giveGiftHandler: IntentionHandler = {
  canExecute: (npc, state) => {
    if (!canExecuteIntention(npc)) return false
    if (!npc.playerRosterMember) return false
    return npcCanGiveGift(state, npc)
  },
  execute: (npc, state) => npcGiveGift(state, npc.npcId),
}

/**
 * Trade With NPC Handler (destiny-bkln)
 * NPC buys an item they want from a co-located roster partner's inventory using personalFunds.
 */
const tradeWithNpcHandler: IntentionHandler = {
  canExecute: (npc, state) => {
    if (!canExecuteIntention(npc)) return false
    if (!npc.playerRosterMember) return false
    return npcCanTradeWithNpc(state, npc)
  },
  execute: (npc, state) => npcTradeWithNpc(state, npc.npcId),
}

// ─────────────────────────────────────────────────────────────────────────────
// All intention handlers mapped by type
// ─────────────────────────────────────────────────────────────────────────────

export const intentionHandlers: Record<NpcIntentionType, IntentionHandler> = {
  // Original 10 types
  'lead-group': leadGroupHandler,
  'support-group': supportGroupHandler,
  'scout-ahead': scoutAheadHandler,
  'resource-gather': resourceGatherHandler,
  'confront-rival': confrontRivalHandler,
  'protect-house': protectHouseHandler,
  'investigate-threat': investigateThreatHandler,
  'patrol-district': patrolDistrictHandler,
  'seek-employment': seekEmploymentHandler,
  'socialize': socializeHandler,
  // Basis-Bedürfnisse (5)
  'eat-meal': eatMealHandler,
  'drink': drinkHandler,
  'sleep': sleepHandler,
  'rest': restHandler,
  'groom': groomHandler,
  // Sozial/Romantik (5 real, all intention-driven — see the redesign note above)
  'flirt-with': flirtWithHandler,
  'court-romantically': courtRomanticallyHandler,
  'visit-lover': visitLoverHandler,
  'jealousy-check': jealousyCheckHandler,
  'spend-time-with': spendTimeWithHandler,
  // Alltagsaktivitäten (4)
  'shop-for-goods': shopForGoodsHandler,
  'train-self': trainSelfHandler,
  'meditate': meditateHandler,
  'practice-skill': practiceSkillHandler,
  // Spezial/Quirky (2)
  'people-watch': peopleWatchHandler,
  'gossip': gossipHandler,
  // Macht/Kontrolle (5)
  'assert-dominance': assertDominanceHandler,
  'spy-on': spyOnHandler,
  'intercept-communication': interceptCommunicationHandler,
  'gather-leverage': gatherLeverageHandler,
  'consolidate-power': consolidatePowerHandler,
  // Gruppen/Dynamik (5)
  'form-squad': formSquadHandler,
  'recruit-member': recruitMemberHandler,
  'host-gathering': hostGatheringHandler,
  'mediate-conflict': mediateConflictHandler,
  'challenge-authority': challengeAuthorityHandler,
  // Überleben/Existenz (5)
  'scavenge': scavengeHandler,
  'fortify-position': fortifyPositionHandler,
  'escape-attempt': escapeAttemptHandler,
  'seek-shelter': seekShelterHandler,
  'care-for-injured': careForInjuredHandler,
  // Romantik/Sexualität (3, all real — destiny-1xd5/rq8u)
  'seek-intimacy': seekIntimacyHandler,
  'flirt-aggressively': flirtAggressivelyHandler,
  'visit-romantic-partner': visitLoverHandler,
  // Geld verdienen (4)
  'seek-tips': careForInjuredHandler, // Placeholder - will be implemented later
  'black-market-trade': careForInjuredHandler, // Placeholder - will be implemented later
  'beg-for-coin': careForInjuredHandler, // Placeholder - will be implemented later
  'scavenge-for-sell': careForInjuredHandler, // Placeholder - will be implemented later
  // NPC Economy (destiny-bkln)
  'repair-equipment': repairEquipmentHandler,
  'use-consumable': useConsumableHandler,
  'give-gift': giveGiftHandler,
  'trade-with-npc': tradeWithNpcHandler,
}

/**
 * Executes an NPC's current intention if they have one and can execute it.
 * Guards are checked inside each handler.
 */
export function executeNpcIntention(npc: NpcRuntimeState, state: GameState): GameState {
  if (!npc.currentIntention) return state

  const handler = intentionHandlers[npc.currentIntention.type]
  if (!handler) return state

  if (handler.canExecute(npc, state)) {
    return handler.execute(npc, state)
  }

  return state
}

/**
 * Processes all roster NPCs and executes their intentions.
 * Called during the agency phase of endDay.
 */
export function executeAllNpcIntentions(state: GameState): GameState {
  let newState = state

  for (const npc of state.npcRuntimeStates) {
    if (npc.currentIntention) {
      newState = executeNpcIntention(npc, newState)
    }
  }

  return newState
}
