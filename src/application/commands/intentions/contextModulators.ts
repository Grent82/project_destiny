/**
 * Context Modulators for NPC Intention Calculation
 *
 * Adjusts intention suitability based on time of day, district safety,
 * and NPC's current relationship state.
 */

import type { GameState } from '../../../domain'
import type { NpcIntentionType } from '../../../domain/npc/contracts'

/**
 * Context factors that influence intention suitability.
 */
export interface IntentionContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  districtSafety: number // 0-100, higher = safer
  npcRelationshipState: 'lonely' | 'content' | 'stressed' | 'euphoric'
  weather?: 'clear' | 'rain' | 'storm' | 'fog'
  hasActiveQuests: boolean
}

/**
 * Multipliers for intention types based on context.
 * Values > 1.0 increase suitability, < 1.0 decrease it.
 */
export const CONTEXT_MULTIPLIERS: Record<string, Record<string, number>> = {
  // Time of day multipliers
  morning: {
    'train-self': 1.4,
    'practice-skill': 1.3,
    'shop-for-goods': 1.3,
    'seek-employment': 1.4,
    'scavenge': 1.2,
    'meditate': 1.2,
    'socialize': 0.8,
    'flirt-with': 0.7,
    'host-gathering': 0.6,
    'sleep': 0.3,
  },
  afternoon: {
    'work_completed': 1.2,
    'socialize': 1.2,
    'flirt-with': 1.2,
    'court-romantically': 1.3,
    'shop-for-goods': 1.2,
    'train-self': 1.1,
    'meditate': 1.0,
    'sleep': 0.5,
  },
  evening: {
    'socialize': 1.4,
    'flirt-with': 1.4,
    'court-romantically': 1.5,
    'visit-lover': 1.4,
    'host-gathering': 1.5,
    'spend-time-with': 1.3,
    'gossip': 1.3,
    'people-watch': 1.2,
    'train-self': 0.7,
    'seek-employment': 0.5,
  },
  night: {
    'sleep': 1.5,
    'rest': 1.3,
    'meditate': 1.2,
    'spy-on': 1.4,
    'intercept-communication': 1.3,
    'people-watch': 1.1,
    'socialize': 0.6,
    'shop-for-goods': 0.3,
    'scavenge': 0.5,
    'protect-house': 1.3,
    'fortify-position': 1.2,
  },
  // District safety multipliers
  unsafe: {
    'protect-house': 1.5,
    'fortify-position': 1.4,
    'seek-shelter': 1.3,
    'scavenge': 0.5,
    'socialize': 0.6,
    'shop-for-goods': 0.5,
    'patrol-district': 1.2,
    'confront-rival': 1.3,
  },
  safe: {
    'socialize': 1.3,
    'shop-for-goods': 1.3,
    'scavenge': 1.2,
    'train-self': 1.2,
    'practice-skill': 1.2,
    'host-gathering': 1.3,
    'protect-house': 0.7,
    'fortify-position': 0.6,
  },
  // Relationship state multipliers
  lonely: {
    'socialize': 1.5,
    'flirt-with': 1.4,
    'visit-lover': 1.4,
    'spend-time-with': 1.4,
    'host-gathering': 1.3,
    'people-watch': 1.2,
    'meditate': 1.1,
  },
  content: {
    'train-self': 1.3,
    'practice-skill': 1.3,
    'shop-for-goods': 1.2,
    'meditate': 1.2,
    'socialize': 1.1,
    'scavenge': 1.2,
  },
  stressed: {
    'meditate': 1.6,
    'rest': 1.4,
    'sleep': 1.3,
    'socialize': 1.2,
    'drink': 1.3,
    'train-self': 0.6,
    'confront-rival': 0.5,
    'assert-dominance': 0.5,
  },
  euphoric: {
    'flirt-with': 1.5,
    'court-romantically': 1.5,
    'host-gathering': 1.5,
    'socialize': 1.4,
    'gossip': 1.3,
    'assert-dominance': 1.2,
    'meditate': 0.7,
  },
  // Weather multipliers
  rain: {
    'scavenge': 0.6,
    'patrol-district': 0.7,
    'socialize': 1.2,
    'meditate': 1.2,
    'train-self': 1.2,
    'shop-for-goods': 0.8,
    'seek-shelter': 1.3,
  },
  storm: {
    'scavenge': 0.4,
    'patrol-district': 0.4,
    'outdoor-intentions': 0.3,
    'meditate': 1.3,
    'train-self': 1.3,
    'socialize': 1.3,
    'seek-shelter': 1.5,
    'sleep': 1.2,
  },
  fog: {
    'scout-ahead': 0.5,
    'spy-on': 1.4,
    'people-watch': 1.3,
    'patrol-district': 0.7,
    'investigate-threat': 1.2,
  },
}

/**
 * Builds the current intention context from game state and NPC state.
 */
export function buildIntentionContext(
  state: GameState,
  npcId: string,
): IntentionContext {
  // Determine time of day from game day (simplified - could be more granular)
  const hour = ((state.day * 24) % 24) as number
  const timeOfDay: IntentionContext['timeOfDay'] =
    hour >= 5 && hour < 11
      ? 'morning'
      : hour >= 11 && hour < 17
        ? 'afternoon'
        : hour >= 17 && hour < 21
          ? 'evening'
          : 'night'

  // Calculate district safety (simplified - could use tension + other factors)
  const districtId = state.currentDistrictId
  const tension = districtId ? (state.districtTension[districtId] ?? 50) : 50
  const districtSafety = 100 - tension

  // Determine relationship state from states and recent interactions
  const npc = state.roster.find((n) => n.npcId === npcId)
  const stress = npc?.states.stress ?? 50
  const morale = npc?.states.morale ?? 50

  let relationshipState: IntentionContext['npcRelationshipState'] = 'content'
  if (stress > 60) relationshipState = 'stressed'
  else if (morale > 70 && stress < 40) relationshipState = 'euphoric'
  else if (morale < 40 && stress < 40) relationshipState = 'lonely'

  // Check for active quests
  const hasActiveQuests = state.activeQuests.length > 0

  return {
    timeOfDay,
    districtSafety,
    npcRelationshipState: relationshipState,
    hasActiveQuests,
  }
}

/**
 * Applies context multipliers to an intention's base score.
 */
export function applyContextModifiers(
  baseScore: number,
  intentionType: NpcIntentionType,
  context: IntentionContext,
): number {
  let multiplier = 1.0

  // Time of day
  const timeMultipliers = CONTEXT_MULTIPLIERS[context.timeOfDay]
  if (timeMultipliers && timeMultipliers[intentionType]) {
    multiplier *= timeMultipliers[intentionType]
  }

  // District safety
  if (context.districtSafety < 40) {
    const unsafeMultipliers = CONTEXT_MULTIPLIERS.unsafe
    if (unsafeMultipliers[intentionType]) {
      multiplier *= unsafeMultipliers[intentionType]
    }
  } else if (context.districtSafety > 70) {
    const safeMultipliers = CONTEXT_MULTIPLIERS.safe
    if (safeMultipliers[intentionType]) {
      multiplier *= safeMultipliers[intentionType]
    }
  }

  // Relationship state
  const stateMultipliers = CONTEXT_MULTIPLIERS[context.npcRelationshipState]
  if (stateMultipliers && stateMultipliers[intentionType]) {
    multiplier *= stateMultipliers[intentionType]
  }

  return Math.round(baseScore * multiplier)
}

/**
 * Returns a list of context-inhibited intention types.
 * These should be deprioritized or blocked entirely.
 */
export function getContextInhibitedIntentions(
  context: IntentionContext,
): NpcIntentionType[] {
  const inhibited: NpcIntentionType[] = []

  // Night time inhibits outdoor activities
  if (context.timeOfDay === 'night') {
    inhibited.push('scavenge', 'patrol-district', 'shop-for-goods')
  }

  // Unsafe district inhibits non-defensive activities
  if (context.districtSafety < 30) {
    inhibited.push('scavenge', 'host-gathering', 'socialize')
  }

  // Stressed state inhibits aggressive intentions
  if (context.npcRelationshipState === 'stressed') {
    inhibited.push('confront-rival', 'assert-dominance', 'challenge-authority')
  }

  return inhibited
}
