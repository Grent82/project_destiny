/**
 * Intention Generation Pipeline
 *
 * Multi-stage process that generates NPC intentions from multiple sources:
 * 1. State-driven (Hunger, Fatigue, Stress) - highest priority
 * 2. Quirk-driven (Personality)
 * 3. Trait-driven (Capabilities)
 * 4. Loyalty-driven (Relationships)
 * 5. Motivation-driven (Goals)
 *
 * Final step: Combine, weight, and select best intention(s)
 */

import type { GameState } from '../../../domain'
import type { NpcIntentionType, NpcRuntimeState } from '../../../domain/npc/contracts'
import { DEFAULT_INTENTION_WEIGHTS, calculateWeightedConfidence } from './mlWeights'
import {
  buildIntentionContext,
  applyContextModifiers,
  getContextInhibitedIntentions,
  type IntentionContext,
} from './contextModulators'

/**
 * Candidate intention with its calculated weight.
 */
interface IntentionCandidate {
  type: NpcIntentionType
  baseWeight: number
  source: 'state' | 'quirk' | 'trait' | 'loyalty' | 'motivation'
  confidence: number
}

/**
 * Stage 1: State-driven intentions (survival needs)
 * Hunger, fatigue, stress, hygiene - these have highest priority
 */
export function getStateDrivenIntentions(npc: NpcRuntimeState): NpcIntentionType[] {
  const intentions: NpcIntentionType[] = []

  // Hunger -> eat-meal
  if (npc.states.hunger > 50) {
    intentions.push('eat-meal')
  } else if (npc.states.hunger > 30) {
    intentions.push('drink')
  }

  // Fatigue -> sleep/rest
  if (npc.states.fatigue > 70) {
    intentions.push('sleep')
  } else if (npc.states.fatigue > 50) {
    intentions.push('rest')
  }

  // Stress -> meditate
  if (npc.states.stress > 55) {
    intentions.push('meditate')
  }

  // Hygiene -> groom
  if (npc.states.hygiene < 40 || npc.traits.vanity >= 65) {
    intentions.push('groom')
  }

  // Intoxication -> rest
  if (npc.states.intoxication > 50) {
    intentions.push('rest')
  }

  return intentions
}

/**
 * Stage 2: Trait-driven personality intentions (personality traits as quirk proxy)
 * Since quirks are on NpcDefinition not NpcRuntimeState, we use traits instead.
 * High trait values act as personality drivers for intentions.
 */
export function getPersonalityDrivenIntentions(npc: NpcRuntimeState): NpcIntentionType[] {
  const intentions: NpcIntentionType[] = []

  // Map high trait values to intention preferences (quirk-like behavior)
  if (npc.traits.prudence >= 65) {
    intentions.push('protect-house', 'seek-shelter', 'fortify-position')
  }
  if (npc.traits.curiosity >= 60) {
    intentions.push('meditate', 'people-watch', 'investigate-threat')
  }
  if (npc.traits.loyalty >= 70) {
    intentions.push('protect-house', 'visit-lover', 'spend-time-with')
  }
  if (npc.traits.ruthlessness >= 60) {
    intentions.push('confront-rival', 'gather-leverage', 'spy-on')
  }
  if (npc.traits.discipline >= 65) {
    intentions.push('practice-skill', 'train-self', 'groom')
  }
  if (npc.traits.dominance >= 60) {
    intentions.push('assert-dominance', 'confront-rival', 'challenge-authority')
  }
  if (npc.traits.vanity >= 60) {
    intentions.push('groom', 'host-gathering', 'people-watch')
  }
  if (npc.traits.ambition >= 65) {
    intentions.push('seek-employment', 'consolidate-power', 'form-squad')
  }

  // Remove duplicates
  return [...new Set(intentions)]
}

/**
 * Stage 3: Trait-driven intentions (capabilities)
 * Based on attributes, skills, and traits - what the NPC is good at
 */
export function getTraitDrivenIntentions(
  npc: NpcRuntimeState,
  state: GameState,
): NpcIntentionType[] {
  const intentions: NpcIntentionType[] = []

  // World state triggers
  if (state.cityResources.corridorStatus === 'blocked') {
    if (npc.attributes.presence >= 60 && npc.traits.ambition >= 50) {
      intentions.push('lead-group')
    }
  }

  if (state.cityResources.foodSecurity < 40) {
    if (npc.skills.survival >= 50) {
      intentions.push('resource-gather')
    }
  }

  // Trait-based intention selection using fuzzy logic
  const traitScores: Record<NpcIntentionType, number> = {
    'lead-group': npc.traits.ambition + npc.attributes.presence + npc.traits.discipline,
    'support-group': npc.traits.empathy + npc.traits.loyalty + npc.skills.administration,
    'scout-ahead': npc.attributes.perception + npc.skills.survival + npc.traits.curiosity,
    'resource-gather': npc.skills.survival + npc.attributes.endurance + npc.traits.prudence,
    'confront-rival': npc.attributes.might + npc.skills.melee + npc.traits.ruthlessness,
    'protect-house': npc.attributes.endurance + npc.traits.discipline + npc.traits.loyalty,
    'investigate-threat': npc.attributes.intellect + npc.skills.intrigue + npc.traits.curiosity,
    'patrol-district': npc.attributes.endurance + npc.skills.survival + npc.attributes.perception,
    'seek-employment': npc.skills.negotiation + npc.traits.ambition + npc.skills.administration,
    'socialize': npc.attributes.presence + npc.traits.empathy + npc.skills.performance,
    'eat-meal': 0,
    'drink': 0,
    'sleep': 0,
    'rest': 0,
    'groom': npc.traits.vanity,
    'flirt-with': npc.attributes.presence + npc.traits.empathy,
    'court-romantically': npc.attributes.presence + npc.traits.empathy + npc.traits.loyalty,
    'visit-lover': npc.traits.loyalty + npc.traits.empathy,
    'jealousy-check': npc.attributes.perception + npc.traits.vanity,
    'spend-time-with': npc.traits.empathy + npc.traits.loyalty,
    'shop-for-goods': npc.skills.negotiation + npc.skills.administration,
    'train-self': npc.traits.discipline + npc.traits.ambition,
    'meditate': npc.attributes.intellect + npc.traits.prudence,
    'practice-skill': npc.traits.curiosity + npc.traits.discipline,
    'people-watch': npc.attributes.perception + npc.traits.curiosity,
    'gossip': npc.skills.performance + npc.skills.intrigue,
    'assert-dominance': npc.traits.dominance + npc.attributes.presence,
    'spy-on': npc.skills.intrigue + npc.traits.curiosity,
    'intercept-communication': npc.skills.intrigue + npc.traits.prudence,
    'gather-leverage': npc.skills.intrigue + npc.traits.ruthlessness,
    'consolidate-power': npc.attributes.presence + npc.traits.ambition + npc.traits.dominance,
    'form-squad': npc.attributes.presence + npc.traits.ambition,
    'recruit-member': npc.skills.negotiation + npc.attributes.presence,
    'host-gathering': npc.skills.performance + npc.attributes.presence,
    'mediate-conflict': npc.traits.empathy + npc.skills.negotiation,
    'challenge-authority': npc.traits.dominance + npc.traits.ruthlessness,
    'scavenge': npc.skills.survival + npc.attributes.endurance,
    'fortify-position': npc.skills.security + npc.skills.engineering,
    'escape-attempt': npc.attributes.agility + npc.attributes.perception,
    'seek-shelter': npc.traits.prudence,
    'care-for-injured': npc.skills.medicine + npc.traits.empathy,
  }

  // Find intentions where NPC has decent capability (score > 130)
  for (const [type, score] of Object.entries(traitScores)) {
    if (score > 130) {
      intentions.push(type as NpcIntentionType)
    }
  }

  return [...new Set(intentions)]
}

/**
 * Stage 4: Relationship-driven intentions (based on relationship axes)
 * Since loyalties are on NpcDefinition not NpcRuntimeState, we use relationship state instead.
 * High affinity/trust/loyalty drives social intentions.
 */
export function getRelationshipDrivenIntentions(
  npc: NpcRuntimeState,
  relationships: GameState['relationships'],
  playerNpcId: string,
): NpcIntentionType[] {
  const intentions: NpcIntentionType[] = []

  // Check relationship with player
  const key = `${playerNpcId}|${npc.npcId}`
  const rel = relationships[key]

  if (rel) {
    // High affinity -> social intentions
    if (rel.affinity >= 60) {
      intentions.push('spend-time-with', 'socialize')
    }
    // High trust -> intimate intentions
    if (rel.trust >= 65) {
      intentions.push('court-romantically', 'visit-lover')
    }
    // High loyalty -> protective intentions
    if (rel.loyalty >= 70) {
      intentions.push('protect-house', 'care-for-injured')
    }
    // High fear -> avoidance or confrontation
    if (rel.fear >= 60) {
      intentions.push('meditate', 'seek-shelter')
    }
    // High respect -> ambitious intentions
    if (rel.respect >= 65) {
      intentions.push('form-squad', 'consolidate-power')
    }
  }

  return [...new Set(intentions)]
}

/**
 * Stage 5: State-driven urgency intentions (current state as motivation proxy)
 * Since motivation is on NpcDefinition not NpcRuntimeState, we use current states instead.
 * High stress, fatigue, etc. drive urgent intentions.
 */
export function getStateUrgencyIntentions(npc: NpcRuntimeState): NpcIntentionType[] {
  const intentions: NpcIntentionType[] = []

  // High stress -> need for relief
  if (npc.states.stress >= 60) {
    intentions.push('meditate', 'drink', 'socialize')
  }

  // High anger -> confrontation or release
  if (npc.states.anger >= 55) {
    intentions.push('confront-rival', 'assert-dominance', 'train-self')
  }

  // High fear -> safety seeking
  if (npc.states.fear >= 55) {
    intentions.push('seek-shelter', 'protect-house', 'meditate')
  }

  // Low morale -> comfort seeking
  if (npc.states.morale < 35) {
    intentions.push('socialize', 'visit-lover', 'meditate')
  }

  // High hunger already handled in Stage 1, but reinforce here
  if (npc.states.hunger >= 70) {
    intentions.push('eat-meal')
  }

  return [...new Set(intentions)]
}

/**
 * Combines all intention candidates from all stages and calculates final weights.
 */
export function combineAndWeightIntentions(
  candidates: IntentionCandidate[],
  npc: NpcRuntimeState,
  context: IntentionContext,
): IntentionCandidate[] {
  // Group by type and sum weights
  const byType = new Map<NpcIntentionType, IntentionCandidate[]>()

  for (const candidate of candidates) {
    const existing = byType.get(candidate.type) ?? []
    existing.push(candidate)
    byType.set(candidate.type, existing)
  }

  // Calculate final weight for each type
  const weighted: IntentionCandidate[] = []

  for (const [type, typeCandidates] of byType.entries()) {
    // Base weight from sources (state > quirk > trait > loyalty > motivation)
    const sourceWeights = {
      state: 3.0,
      quirk: 1.5,
      trait: 2.0,
      loyalty: 1.8,
      motivation: 2.2,
    }

    let totalWeight = 0
    let maxConfidence = 0

    for (const c of typeCandidates) {
      totalWeight += c.baseWeight * sourceWeights[c.source]
      if (c.confidence > maxConfidence) maxConfidence = c.confidence
    }

    // Apply ML weights
    const mlWeightConfig = DEFAULT_INTENTION_WEIGHTS[type]
    const mlConfidence = calculateWeightedConfidence(npc, type, mlWeightConfig)

    // Apply context modifiers
    const contextualConfidence = applyContextModifiers(mlConfidence, type, context)

    weighted.push({
      type,
      baseWeight: totalWeight / typeCandidates.length,
      source: typeCandidates[0].source,
      confidence: contextualConfidence,
    })
  }

  return weighted
}

/**
 * Selects the best intention(s) from weighted candidates.
 * Returns top 1-2 intentions based on confidence and urgency.
 */
export function selectBestIntentions(
  candidates: IntentionCandidate[],
  inhibited: NpcIntentionType[],
): NpcIntentionType[] {
  // Filter out inhibited intentions
  const filtered = candidates.filter((c) => !inhibited.includes(c.type))

  if (filtered.length === 0) return []

  // Sort by confidence (highest first)
  const sorted = filtered.sort((a, b) => b.confidence - a.confidence)

  // Return top intention if confidence > 50
  if (sorted[0].confidence > 50) {
    return [sorted[0].type]
  }

  // Return top 2 if both have confidence > 40
  if (sorted.length > 1 && sorted[1].confidence > 40) {
    return [sorted[0].type, sorted[1].type]
  }

  return []
}

/**
 * Main pipeline function - runs all stages and returns the best intention.
 */
export function generateNpcIntention(
  state: GameState,
  npc: NpcRuntimeState,
): NpcIntentionType | null {
  // Build context
  const context = buildIntentionContext(state, npc.npcId)

  // Get inhibited intentions from context
  const inhibited = getContextInhibitedIntentions(context)

  // Stage 1: State-driven (survival needs)
  const stateIntentions = getStateDrivenIntentions(npc)

  // Stage 2: Personality-driven (traits as quirk proxy)
  const personalityIntentions = getPersonalityDrivenIntentions(npc)

  // Stage 3: Trait-driven (capabilities)
  const traitIntentions = getTraitDrivenIntentions(npc, state)

  // Stage 4: Relationship-driven (relationship axes)
  const relationshipIntentions = getRelationshipDrivenIntentions(
    npc,
    state.relationships,
    'player',
  )

  // Stage 5: State urgency-driven (current state as motivation proxy)
  const urgencyIntentions = getStateUrgencyIntentions(npc)

  // Combine all into candidates with base weights
  const candidates: IntentionCandidate[] = [
    ...stateIntentions.map((t) => ({ type: t, baseWeight: 3.0, source: 'state' as const, confidence: 70 })),
    ...personalityIntentions.map((t) => ({ type: t, baseWeight: 1.5, source: 'quirk' as const, confidence: 50 })),
    ...traitIntentions.map((t) => ({ type: t, baseWeight: 2.0, source: 'trait' as const, confidence: 60 })),
    ...relationshipIntentions.map((t) => ({ type: t, baseWeight: 1.8, source: 'loyalty' as const, confidence: 55 })),
    ...urgencyIntentions.map((t) => ({ type: t, baseWeight: 2.2, source: 'motivation' as const, confidence: 65 })),
  ]

  // Weight and select
  const weighted = combineAndWeightIntentions(candidates, npc, context)
  const selected = selectBestIntentions(weighted, inhibited)

  return selected[0] ?? null
}
