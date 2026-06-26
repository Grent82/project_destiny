import type { GameState, NpcIntention, NpcIntentionType } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { npcIntentionSchema } from '../../domain/npc/contracts'

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
    case 'lead-coalition':
      // Leadership requires presence, ambition, and discipline
      confidence += (npc.attributes.presence - 50) / 2
      confidence += (npc.traits.ambition - 50) / 3
      confidence += (npc.traits.discipline - 50) / 3
      break

    case 'support-coalition':
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
    'lead-coalition': 5,
    'support-coalition': 4,
    'scout-ahead': 3,
    'resource-gather': 4,
    'confront-rival': 2,
    'protect-house': 3,
    'investigate-threat': 3,
    'patrol-district': 5,
    'seek-employment': 6,
    'socialize': 7,
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
    case 'lead-coalition':
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
  if (state.cityResources.corridorStatus === 'blocked' && intentionType === 'lead-coalition') {
    priority += 1
  }

  if (state.cityResources.foodSecurity < 30 && intentionType === 'resource-gather') {
    priority += 1
  }

  return Math.max(1, Math.min(5, priority))
}

/**
 * Determines the most suitable intention type for an NPC based on their profile and world state.
 */
function determineIntentionType(npc: NpcRuntimeState, state: GameState): NpcIntentionType | null {
  // World state first - some intentions are triggered by world conditions
  if (state.cityResources.corridorStatus === 'blocked') {
    // High priority to lead coalition if capable
    if (npc.attributes.presence >= 60 && npc.traits.ambition >= 50) {
      return 'lead-coalition'
    }
  }

  if (state.cityResources.foodSecurity < 40) {
    // Resource gathering becomes more important
    if (npc.skills.survival >= 50) {
      return 'resource-gather'
    }
  }

  // Trait-based intention selection
  const traitScores = {
    'lead-coalition': npc.traits.ambition + npc.attributes.presence + npc.traits.discipline,
    'support-coalition': npc.traits.empathy + npc.traits.loyalty + npc.skills.administration,
    'scout-ahead': npc.attributes.perception + npc.skills.survival + npc.traits.curiosity,
    'resource-gather': npc.skills.survival + npc.attributes.endurance + npc.traits.prudence,
    'confront-rival': npc.attributes.might + npc.skills.melee + npc.traits.ruthlessness,
    'protect-house': npc.attributes.endurance + npc.traits.discipline + npc.traits.loyalty,
    'investigate-threat': npc.attributes.intellect + npc.skills.intrigue + npc.traits.curiosity,
    'patrol-district': npc.attributes.endurance + npc.skills.survival + npc.attributes.perception,
    'seek-employment': npc.skills.negotiation + npc.traits.ambition + npc.skills.administration,
    'socialize': npc.attributes.presence + npc.traits.empathy + npc.skills.performance,
  }

  // Find the highest scoring intention type
  let bestType: NpcIntentionType | null = null
  let bestScore = 0

  for (const [type, score] of Object.entries(traitScores)) {
    if (score > bestScore) {
      bestScore = score
      bestType = type as NpcIntentionType
    }
  }

  // Only return an intention if the NPC has decent capability (score > 120)
  if (bestScore > 120 && bestType) {
    return bestType
  }

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
 * If guards pass, calculates:
 * - Intention type based on traits/skills/world state
 * - Priority based on traits and urgency
 * - Confidence based on relevant attributes/skills
 * - Urgency based on intention type and world conditions
 */
export function calculateNpcIntention(state: GameState, npcId: string): NpcIntention | null {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return null

  // Check guard conditions
  if (isNpcBlockedFromIntention(npc)) return null

  // Determine the best intention type for this NPC
  const intentionType = determineIntentionType(npc, state)
  if (!intentionType) return null

  // Calculate intention parameters
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
