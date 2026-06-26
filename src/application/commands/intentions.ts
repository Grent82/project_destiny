import type { GameState, NpcIntention, NpcIntentionType } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { npcIntentionSchema } from '../../domain/npc/contracts'
import { generateNpcIntention } from './intentions/pipeline'

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
    // Alltagsaktivitäten (4)
    'shop-for-goods': 4,
    'train-self': 6,
    'meditate': 3,
    'practice-skill': 5,
    // Spezial/Quirky (2)
    'people-watch': 7,
    'gossip': 6,
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
 * Legacy function - no longer used by the new pipeline-based intention system.
 * Kept for potential future reference or migration.
 * TODO: Remove in future refactoring.
 */
export function _determineIntentionType(): NpcIntentionType | null {
  return null
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
  const npc = state.roster.find((n) => n.npcId === npcId)
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

  for (const npc of state.roster) {
    // Skip NPCs who already have an intention or directive
    if (npc.currentIntention) continue
    if (npc.currentDirectiveId) continue

    // Calculate intention for idle NPCs
    const intention = calculateNpcIntention(newState, npc.npcId)
    if (intention) {
      newState = {
        ...newState,
        roster: newState.roster.map((n) =>
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
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || !npc.currentIntention) return state

  return {
    ...state,
    roster: state.roster.map((n) =>
      n.npcId === npcId ? { ...n, currentIntention: null } : n,
    ),
  }
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
  execute: (_npc, state) => {
    // Placeholder - would create scout activity
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would add resources to stash
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would initiate confrontation
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would set up defense posture
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would start investigation
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would create patrol activity
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would look for hire offers
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would create social interaction
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would consume food, reduce hunger
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would reduce thirst, possibly increase intoxication
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would reduce fatigue significantly
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would reduce fatigue moderately
    return state
  },
}

/**
 * Groom Handler
 * NPC improves hygiene, satisfies vanity.
 */
const groomHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires low hygiene or high vanity
    return npc.states.hygiene < 40 || npc.traits.vanity >= 60
  },
  execute: (_npc, state) => {
    // Placeholder - would improve hygiene
    return state
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sozial/Romantik (5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flirt With Handler
 * NPC flirts with a specific NPC (Affinity test).
 */
const flirtWithHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires presence, empathy, and some affinity with target
    return npc.attributes.presence >= 40 || npc.traits.empathy >= 40
  },
  execute: (_npc, state) => {
    // Placeholder - would attempt flirtation with target NPC
    return state
  },
}

/**
 * Court Romantically Handler
 * NPC makes a romantic advance (higher threshold).
 */
const courtRomanticallyHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires high presence, empathy, and affinity
    return npc.attributes.presence >= 50 && npc.traits.empathy >= 50
  },
  execute: (_npc, state) => {
    // Placeholder - would attempt romantic courtship
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would visit target NPC
    return state
  },
}

/**
 * Jealousy Check Handler
 * NPC checks for rivalry/jealousy situations.
 */
const jealousyCheckHandler: IntentionHandler = {
  canExecute: (npc) => {
    if (!canExecuteIntention(npc)) return false
    // Requires perception and some insecurity
    return npc.attributes.perception >= 40 || npc.traits.vanity >= 50
  },
  execute: (_npc, state) => {
    // Placeholder - would investigate potential rivals
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would spend time with target NPC
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would train, potentially gain skill XP
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would reduce stress
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would practice skill, gain minor XP
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would observe NPCs, potentially learn rumors
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would spread/gather gossip
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would assert dominance over target
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would spy on target NPC
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would intercept communication
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would gather blackmail material
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would consolidate influence
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would host social gathering
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would mediate between conflicting parties
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would challenge authority
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would scavenge for resources
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would fortify position
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would attempt escape
    return state
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
  execute: (_npc, state) => {
    // Placeholder - would seek shelter
    return state
  },
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
  execute: (_npc, state) => {
    // Placeholder - would treat injured NPCs
    return state
  },
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
  // Sozial/Romantik (5)
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

  for (const npc of state.roster) {
    if (npc.currentIntention) {
      newState = executeNpcIntention(npc, newState)
    }
  }

  return newState
}
