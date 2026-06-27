/**
 * Machine Learning-style Weighted Scoring for NPC Intentions
 *
 * NPCs learn from their successes and failures, developing a personal "style"
 * over 7-10 days of game time. Weights adjust based on intention outcomes.
 */

import type { NpcIntentionType } from '../../../domain/npc/contracts'
import type { Attributes, Skills, Traits } from '../../../domain/npc/contracts'

/**
 * Weight configuration for a single intention type.
 * Each NPC maintains their own weights, allowing for personality divergence.
 */
export interface IntentionWeightConfig {
  attributeWeights: Partial<Record<keyof Attributes, number>>
  skillWeights: Partial<Record<keyof Skills, number>>
  traitWeights: Partial<Record<keyof Traits, number>>
}

/**
 * Learning profile for an NPC's intention history.
 * Tracks success rates and weight adjustments over time.
 */
export interface IntentionProfile {
  intentionType: NpcIntentionType
  weights: IntentionWeightConfig
  successCount: number
  failureCount: number
  lastExecutionDay: number
  weightAdjustmentHistory: Array<{
    day: number
    type: 'success' | 'failure'
    adjustments: {
      attribute?: keyof Attributes
      skill?: keyof Skills
      trait?: keyof Traits
      delta: number
    }
  }>
}

/**
 * Default weight configuration for each intention type.
 * Used as baseline for new NPCs or intentions they haven't tried yet.
 */
export const DEFAULT_INTENTION_WEIGHTS: Record<NpcIntentionType, IntentionWeightConfig> = {
  'lead-group': {
    attributeWeights: { presence: 1.2, endurance: 0.8 },
    skillWeights: { negotiation: 1.0 },
    traitWeights: { ambition: 1.3, discipline: 1.0 },
  },
  'support-group': {
    attributeWeights: { presence: 0.8 },
    skillWeights: { administration: 1.0 },
    traitWeights: { empathy: 1.3, loyalty: 1.2 },
  },
  'scout-ahead': {
    attributeWeights: { perception: 1.3, agility: 0.8 },
    skillWeights: { survival: 1.3 },
    traitWeights: { curiosity: 1.2 },
  },
  'resource-gather': {
    attributeWeights: { endurance: 1.0 },
    skillWeights: { survival: 1.3 },
    traitWeights: { prudence: 1.2 },
  },
  'confront-rival': {
    attributeWeights: { might: 1.3 },
    skillWeights: { melee: 1.3 },
    traitWeights: { ruthlessness: 1.3, dominance: 1.0 },
  },
  'protect-house': {
    attributeWeights: { endurance: 1.2 },
    skillWeights: { security: 1.0 },
    traitWeights: { loyalty: 1.3, discipline: 1.2 },
  },
  'investigate-threat': {
    attributeWeights: { intellect: 1.2, perception: 1.0 },
    skillWeights: { intrigue: 1.3 },
    traitWeights: { curiosity: 1.3 },
  },
  'patrol-district': {
    attributeWeights: { endurance: 1.0, perception: 1.0 },
    skillWeights: { survival: 1.0, security: 1.0 },
    traitWeights: { discipline: 1.0 },
  },
  'seek-employment': {
    attributeWeights: { presence: 0.8 },
    skillWeights: { negotiation: 1.3, administration: 0.8 },
    traitWeights: { ambition: 1.3 },
  },
  'socialize': {
    attributeWeights: { presence: 1.2 },
    skillWeights: { performance: 1.2 },
    traitWeights: { empathy: 1.3 },
  },
  // Basis-Bedürfnisse
  'eat-meal': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: {},
  },
  'drink': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { vanity: 0.5 },
  },
  'sleep': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: {},
  },
  'rest': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: {},
  },
  'groom': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { vanity: 1.5 },
  },
  // Sozial/Romantik
  'flirt-with': {
    attributeWeights: { presence: 1.3 },
    skillWeights: { performance: 1.0 },
    traitWeights: { empathy: 1.2, vanity: 0.8 },
  },
  'court-romantically': {
    attributeWeights: { presence: 1.2 },
    skillWeights: { negotiation: 1.0 },
    traitWeights: { empathy: 1.3, loyalty: 0.8 },
  },
  'visit-lover': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { loyalty: 1.3, empathy: 1.0 },
  },
  'jealousy-check': {
    attributeWeights: { perception: 1.2 },
    skillWeights: { intrigue: 1.0 },
    traitWeights: { vanity: 1.3, curiosity: 0.8 },
  },
  'spend-time-with': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { empathy: 1.2, loyalty: 1.2 },
  },
  // Alltagsaktivitäten
  'shop-for-goods': {
    attributeWeights: {},
    skillWeights: { negotiation: 1.3, administration: 1.0 },
    traitWeights: { prudence: 1.0 },
  },
  'train-self': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { discipline: 1.3, ambition: 1.2 },
  },
  'meditate': {
    attributeWeights: { intellect: 0.8 },
    skillWeights: {},
    traitWeights: { prudence: 1.0 },
  },
  'practice-skill': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { curiosity: 1.2, discipline: 1.2 },
  },
  // Spezial/Quirky
  'people-watch': {
    attributeWeights: { perception: 1.3 },
    skillWeights: { intrigue: 0.8 },
    traitWeights: { curiosity: 1.3 },
  },
  'gossip': {
    attributeWeights: {},
    skillWeights: { performance: 1.2, intrigue: 1.0 },
    traitWeights: { curiosity: 1.0 },
  },
  // Macht/Kontrolle
  'assert-dominance': {
    attributeWeights: { presence: 1.0, might: 0.8 },
    skillWeights: {},
    traitWeights: { dominance: 1.5, ruthlessness: 1.0 },
  },
  'spy-on': {
    attributeWeights: { perception: 1.0 },
    skillWeights: { intrigue: 1.5 },
    traitWeights: { curiosity: 1.2, prudence: 0.8 },
  },
  'intercept-communication': {
    attributeWeights: {},
    skillWeights: { intrigue: 1.3 },
    traitWeights: { prudence: 1.2, ruthlessness: 0.8 },
  },
  'gather-leverage': {
    attributeWeights: { intellect: 0.8 },
    skillWeights: { intrigue: 1.3 },
    traitWeights: { ruthlessness: 1.3, ambition: 1.0 },
  },
  'consolidate-power': {
    attributeWeights: { presence: 1.2 },
    skillWeights: { administration: 1.0 },
    traitWeights: { ambition: 1.3, dominance: 1.2 },
  },
  // Gruppen/Dynamik
  'form-squad': {
    attributeWeights: { presence: 1.3 },
    skillWeights: { negotiation: 1.0 },
    traitWeights: { ambition: 1.2, dominance: 1.0 },
  },
  'recruit-member': {
    attributeWeights: { presence: 1.2 },
    skillWeights: { negotiation: 1.3 },
    traitWeights: { empathy: 1.0 },
  },
  'host-gathering': {
    attributeWeights: { presence: 1.3 },
    skillWeights: { performance: 1.3 },
    traitWeights: { vanity: 1.0, empathy: 1.0 },
  },
  'mediate-conflict': {
    attributeWeights: {},
    skillWeights: { negotiation: 1.3 },
    traitWeights: { empathy: 1.5, prudence: 1.0 },
  },
  'challenge-authority': {
    attributeWeights: { presence: 0.8 },
    skillWeights: { negotiation: 1.0 },
    traitWeights: { dominance: 1.3, ruthlessness: 1.2 },
  },
  // Überleben/Existenz
  'scavenge': {
    attributeWeights: { endurance: 1.0 },
    skillWeights: { survival: 1.5 },
    traitWeights: { prudence: 1.0 },
  },
  'fortify-position': {
    attributeWeights: { endurance: 1.0 },
    skillWeights: { engineering: 1.2, security: 1.2 },
    traitWeights: { discipline: 1.2, prudence: 1.0 },
  },
  'escape-attempt': {
    attributeWeights: { agility: 1.3, perception: 1.0 },
    skillWeights: { survival: 1.0 },
    traitWeights: { curiosity: 0.8 },
  },
  'seek-shelter': {
    attributeWeights: {},
    skillWeights: {},
    traitWeights: { prudence: 1.5 },
  },
  'care-for-injured': {
    attributeWeights: {},
    skillWeights: { medicine: 1.5 },
    traitWeights: { empathy: 1.3 },
  },
  // Romantik/Sexualität (3)
  'seek-intimacy': {
    attributeWeights: { presence: 1.2, resolve: 0.8 },
    skillWeights: { negotiation: 1.0, performance: 1.2 },
    traitWeights: { empathy: 1.2, vanity: 1.0 },
  },
  'flirt-aggressively': {
    attributeWeights: { presence: 1.3, might: 0.8 },
    skillWeights: { intrigue: 1.2 },
    traitWeights: { dominance: 1.3, ruthlessness: 1.0 },
  },
  'visit-romantic-partner': {
    attributeWeights: { presence: 1.0 },
    skillWeights: {},
    traitWeights: { loyalty: 1.2, empathy: 1.1 },
  },
}

/**
 * Calculates the confidence score for an intention based on weighted factors.
 * Uses the NPC's current weights (which may have been adjusted through learning).
 */
export function calculateWeightedConfidence(
  npc: {
    attributes: Record<string, number>
    skills: Record<string, number>
    traits: Record<string, number>
  },
  _intentionType: NpcIntentionType,
  weights: IntentionWeightConfig,
): number {
  let score = 50 // Base score

  // Attribute contributions
  for (const [attr, weight] of Object.entries(weights.attributeWeights)) {
    const value = npc.attributes[attr as keyof Attributes] ?? 50
    score += ((value - 50) / 50) * weight * 15
  }

  // Skill contributions
  for (const [skill, weight] of Object.entries(weights.skillWeights)) {
    const value = npc.skills[skill as keyof Skills] ?? 50
    score += ((value - 50) / 50) * weight * 15
  }

  // Trait contributions
  for (const [trait, weight] of Object.entries(weights.traitWeights)) {
    const value = npc.traits[trait as keyof Traits] ?? 50
    score += ((value - 50) / 50) * weight * 15
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Adjusts weights after a successful intention execution.
 * Slightly increases weights for attributes/skills/traits that contributed.
 * Called after executeNpcIntention succeeds.
 */
export function adjustWeightsOnSuccess(
  profile: IntentionProfile,
  npc: {
    attributes: Record<string, number>
    skills: Record<string, number>
    traits: Record<string, number>
  },
): IntentionWeightConfig {
  const newWeights = JSON.parse(JSON.stringify(profile.weights))
  const adjustmentAmount = 0.05 // 5% adjustment per success

  // Increase weights for high values (> 60)
  for (const [attr, weight] of Object.entries(newWeights.attributeWeights)) {
    if ((npc.attributes[attr as keyof Attributes] ?? 50) > 60) {
      newWeights.attributeWeights[attr as keyof Attributes] = (weight as number) + adjustmentAmount
    }
  }
  for (const [skill, weight] of Object.entries(newWeights.skillWeights)) {
    if ((npc.skills[skill as keyof Skills] ?? 50) > 60) {
      newWeights.skillWeights[skill as keyof Skills] = (weight as number) + adjustmentAmount
    }
  }
  for (const [trait, weight] of Object.entries(newWeights.traitWeights)) {
    if ((npc.traits[trait as keyof Traits] ?? 50) > 60) {
      newWeights.traitWeights[trait as keyof Traits] = (weight as number) + adjustmentAmount
    }
  }

  return newWeights
}

/**
 * Adjusts weights after a failed intention execution.
 * Slightly decreases weights for underperforming factors.
 */
export function adjustWeightsOnFailure(
  profile: IntentionProfile,
  npc: {
    attributes: Record<string, number>
    skills: Record<string, number>
    traits: Record<string, number>
  },
): IntentionWeightConfig {
  const newWeights = JSON.parse(JSON.stringify(profile.weights))
  const adjustmentAmount = 0.03 // 3% adjustment per failure (less than success)

  // Decrease weights for low values (< 40)
  for (const [attr, weight] of Object.entries(newWeights.attributeWeights)) {
    if ((npc.attributes[attr as keyof Attributes] ?? 50) < 40) {
      newWeights.attributeWeights[attr as keyof Attributes] = Math.max(0.3, (weight as number) - adjustmentAmount)
    }
  }
  for (const [skill, weight] of Object.entries(newWeights.skillWeights)) {
    if ((npc.skills[skill as keyof Skills] ?? 50) < 40) {
      newWeights.skillWeights[skill as keyof Skills] = Math.max(0.3, (weight as number) - adjustmentAmount)
    }
  }
  for (const [trait, weight] of Object.entries(newWeights.traitWeights)) {
    if ((npc.traits[trait as keyof Traits] ?? 50) < 40) {
      newWeights.traitWeights[trait as keyof Traits] = Math.max(0.3, (weight as number) - adjustmentAmount)
    }
  }

  return newWeights
}

/**
 * Calculates success rate for an intention profile.
 * Used to determine if an NPC has developed a "style" for this intention.
 */
export function getSuccessRate(profile: IntentionProfile): number {
  const total = profile.successCount + profile.failureCount
  if (total === 0) return 0.5 // Neutral for new intentions
  return profile.successCount / total
}

/**
 * Determines if an NPC has developed a distinct style for an intention.
 * Requires at least 5 executions with a success rate > 0.6 or < 0.4.
 */
export function hasDevelopedStyle(profile: IntentionProfile): boolean {
  const total = profile.successCount + profile.failureCount
  if (total < 5) return false

  const successRate = getSuccessRate(profile)
  return successRate > 0.6 || successRate < 0.4
}
