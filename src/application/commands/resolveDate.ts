import type { GameState } from '../../domain/game/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'

interface DateOutcome {
  id: string
  text: string
  axesDeltas: {
    affinity?: number
    trust?: number
    respect?: number
    loyalty?: number
    fear?: number
    anger?: number
  }
}

interface DateTemplate {
  id: string
  name: string
  description: string
  cost: number
  durationHours: number
  preferredTimeSlot: string
  requiredIntimacyStage: string
  traitPreferences: Record<string, number>
  skillPreferences: Record<string, number>
  relationshipRewards: {
    affinity: { min: number; max: number }
    trust: { min: number; max: number }
    respect?: { min: number; max: number }
    loyalty?: { min: number; max: number }
  }
  outcomes: DateOutcome[]
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function advanceSeed(seed: number): number {
  return (seed * 1103515245 + 12345) & 0x7fffffff
}

function pickOutcome(seed: number, outcomes: DateOutcome[]): DateOutcome {
  const index = Math.floor(seededRandom(seed) * outcomes.length)
  return outcomes[index]!
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export interface ResolveDateParams {
  dateId: string
  outcomeIndex?: number
}

export interface DateResolution {
  success: boolean
  outcomeText: string
  axesDeltas: {
    affinity: number
    trust: number
    respect: number
    loyalty: number
  }
  message: string
}

const DATES: Record<string, DateTemplate> = {
  'date-quiet-walk': {
    id: 'date-quiet-walk',
    name: 'Quiet Walk in the Gardens',
    description: 'A peaceful stroll through the house gardens.',
    cost: 0,
    durationHours: 1,
    preferredTimeSlot: 'evening',
    requiredIntimacyStage: 'affinity',
    traitPreferences: { empathy: 1.2, curiosity: 1.1 },
    skillPreferences: { performance: 0.8 },
    relationshipRewards: {
      affinity: { min: 3, max: 6 },
      trust: { min: 2, max: 4 },
      respect: { min: 1, max: 3 },
    },
    outcomes: [
      {
        id: 'walk-silent-comfort',
        text: 'You walk together in comfortable silence. The evening air is cool, and for a moment, the world feels still.',
        axesDeltas: { trust: 2, affinity: 3 },
      },
      {
        id: 'walk-deep-talk',
        text: 'The quiet walk opens a door to conversation neither of you expected. Secrets and dreams spill into the twilight.',
        axesDeltas: { trust: 4, affinity: 5, respect: 2 },
      },
      {
        id: 'walk-awkward-silence',
        text: 'The silence stretches too long. You both feel the weight of things unsaid, but there is no harm done.',
        axesDeltas: { affinity: 1 },
      },
    ],
  },
  'date-shared-meal': {
    id: 'date-shared-meal',
    name: 'Shared Meal',
    description: 'A simple meal together, prepared with care.',
    cost: 15,
    durationHours: 2,
    preferredTimeSlot: 'evening',
    requiredIntimacyStage: 'affinity',
    traitPreferences: { empathy: 1.3, prudence: 1.1 },
    skillPreferences: { administration: 0.9 },
    relationshipRewards: {
      affinity: { min: 4, max: 8 },
      trust: { min: 3, max: 5 },
      loyalty: { min: 1, max: 3 },
    },
    outcomes: [
      {
        id: 'meal-warmth',
        text: 'The meal is simple but warm. You share bread and stories, and for a while, the house feels like a home.',
        axesDeltas: { affinity: 5, trust: 3, loyalty: 2 },
      },
      {
        id: 'meal-celebration',
        text: 'Something about tonight makes the food taste better. Laughter comes easily, and you both linger at the table long after.',
        axesDeltas: { affinity: 7, trust: 4, loyalty: 3 },
      },
      {
        id: 'meal-meh',
        text: 'The meal is adequate. Nothing special, but nothing wrong either. A quiet evening shared.',
        axesDeltas: { affinity: 2, trust: 1 },
      },
    ],
  },
  'date-music-night': {
    id: 'date-music-night',
    name: 'Music and Stories',
    description: 'One of you plays while the other listens.',
    cost: 5,
    durationHours: 2,
    preferredTimeSlot: 'night',
    requiredIntimacyStage: 'attachment',
    traitPreferences: { empathy: 1.4, vanity: 0.9 },
    skillPreferences: { performance: 1.5, academics: 1.2 },
    relationshipRewards: {
      affinity: { min: 5, max: 10 },
      trust: { min: 4, max: 7 },
      respect: { min: 2, max: 5 },
    },
    outcomes: [
      {
        id: 'music-vulnerability',
        text: 'The music opens something deep. You see a side of them you have never known, and they see yours in return.',
        axesDeltas: { affinity: 8, trust: 6, respect: 3 },
      },
      {
        id: 'music-harmony',
        text: 'Your voices blend together in ways that surprise you both. For a moment, you feel perfectly in sync.',
        axesDeltas: { affinity: 6, trust: 4, respect: 2 },
      },
      {
        id: 'music-off-key',
        text: 'The tune falters, and you both laugh. It is imperfect, but the laughter is genuine.',
        axesDeltas: { affinity: 3, trust: 2 },
      },
    ],
  },
  'date-workshop-project': {
    id: 'date-workshop-project',
    name: 'Workshop Project',
    description: 'Working together on a small repair or creation.',
    cost: 10,
    durationHours: 3,
    preferredTimeSlot: 'afternoon',
    requiredIntimacyStage: 'affinity',
    traitPreferences: { prudence: 1.2, ambition: 1.1 },
    skillPreferences: { engineering: 1.3, crafting: 1.3, administration: 1.0 },
    relationshipRewards: {
      affinity: { min: 3, max: 6 },
      trust: { min: 2, max: 4 },
      respect: { min: 4, max: 8 },
      loyalty: { min: 2, max: 4 },
    },
    outcomes: [
      {
        id: 'workshop-success',
        text: 'The project comes together better than expected. You look at what you have built and feel a quiet pride in the work—and in each other.',
        axesDeltas: { affinity: 5, respect: 6, loyalty: 3 },
      },
      {
        id: 'workshop-struggle',
        text: 'It is harder than anticipated, but you persist. The shared struggle forges something stronger than ease ever could.',
        axesDeltas: { respect: 5, loyalty: 4, affinity: 2 },
      },
      {
        id: 'workshop-messy',
        text: 'The project is a mess, but you are both laughing by the end. Sometimes failure is more memorable than success.',
        axesDeltas: { affinity: 3, respect: 1 },
      },
    ],
  },
  'date-private-ritual': {
    id: 'date-private-ritual',
    name: 'Private Ritual',
    description: 'An intimate moment that transcends words.',
    cost: 0,
    durationHours: 2,
    preferredTimeSlot: 'night',
    requiredIntimacyStage: 'committed',
    traitPreferences: { empathy: 1.5, dominance: 1.0, loyalty: 1.3 },
    skillPreferences: {},
    relationshipRewards: {
      affinity: { min: 6, max: 12 },
      trust: { min: 5, max: 10 },
      loyalty: { min: 4, max: 8 },
    },
    outcomes: [
      {
        id: 'ritual-union',
        text: 'There are no words for what passes between you. When it ends, you are both changed—bound tighter than before.',
        axesDeltas: { affinity: 10, trust: 8, loyalty: 6 },
      },
      {
        id: 'ritual-quiet',
        text: 'A quiet intimacy, gentle and sure. You rest together in the aftermath, and the world feels distant and unimportant.',
        axesDeltas: { affinity: 7, trust: 6, loyalty: 5 },
      },
      {
        id: 'ritual-tender',
        text: 'The moment is tender, almost fragile. You both handle it with care, and it becomes something precious.',
        axesDeltas: { affinity: 8, trust: 7, loyalty: 4 },
      },
    ],
  },
  'date-district-exploration': {
    id: 'date-district-exploration',
    name: 'District Exploration',
    description: 'Walking the districts together, seeing the city through each other eyes.',
    cost: 8,
    durationHours: 3,
    preferredTimeSlot: 'afternoon',
    requiredIntimacyStage: 'attachment',
    traitPreferences: { curiosity: 1.4, ambition: 1.2 },
    skillPreferences: { negotiation: 1.1, survival: 1.0 },
    relationshipRewards: {
      affinity: { min: 4, max: 7 },
      respect: { min: 3, max: 6 },
      trust: { min: 2, max: 5 },
    },
    outcomes: [
      {
        id: 'explore-discovery',
        text: 'You find a corner of the city neither of you knew. It becomes your place now—a secret shared.',
        axesDeltas: { affinity: 6, respect: 4, trust: 3 },
      },
      {
        id: 'explore-tension',
        text: 'The district is tense today, but you navigate it together. The shared vigilance brings you closer.',
        axesDeltas: { respect: 5, trust: 4, affinity: 2 },
      },
      {
        id: 'explore-pleasant',
        text: 'A pleasant walk through familiar streets. Nothing extraordinary, but the company makes it worthwhile.',
        axesDeltas: { affinity: 4, respect: 2 },
      },
    ],
  },
  'date-quiet-morning': {
    id: 'date-quiet-morning',
    name: 'Quiet Morning Together',
    description: 'Waking before the world, sharing coffee or tea in the pale morning light.',
    cost: 3,
    durationHours: 1,
    preferredTimeSlot: 'morning',
    requiredIntimacyStage: 'attachment',
    traitPreferences: { empathy: 1.3, prudence: 1.2 },
    skillPreferences: {},
    relationshipRewards: {
      affinity: { min: 4, max: 7 },
      trust: { min: 4, max: 6 },
      loyalty: { min: 2, max: 4 },
    },
    outcomes: [
      {
        id: 'morning-peace',
        text: 'The house is silent except for the clink of cups. You watch them in the morning light and feel something settle in your chest.',
        axesDeltas: { affinity: 5, trust: 5, loyalty: 3 },
      },
      {
        id: 'morning-plans',
        text: 'You talk about things that might happen, futures that might be. For the first time, the future does not feel like a threat.',
        axesDeltas: { affinity: 6, trust: 4, loyalty: 4 },
      },
      {
        id: 'morning-simple',
        text: 'Just coffee and quiet. But it is enough.',
        axesDeltas: { affinity: 3, trust: 3 },
      },
    ],
  },
}

/**
 * Resolves a scheduled date between two NPCs (Roster, World, or cross-type).
 * Updates relationship axes for both NPCs.
 * Handles pregnancy for Roster NPCs at committed stage.
 */
export function resolveDate(
  state: GameState,
  params: ResolveDateParams,
): GameState {
  const { dateId, outcomeIndex } = params

  const scheduledDate = state.scheduledDates.find((d) => d.dateId === dateId)
  if (!scheduledDate) {
    return state
  }

  const dateTemplateId = scheduledDate.dateTemplateId
  const template = DATES[dateTemplateId]

  if (!template) {
    return state
  }

  const npcAId = scheduledDate.npcIds[0]!
  const npcBId = scheduledDate.npcIds[1]!

  let seed = state.rngSeed
  seed = advanceSeed(seed)

  let outcome: DateOutcome
  if (outcomeIndex !== undefined) {
    outcome = template.outcomes[outcomeIndex % template.outcomes.length]
  } else {
    outcome = pickOutcome(seed, template.outcomes)
    seed = advanceSeed(seed)
  }

  // Update relationships for both directions (works for any NPC type)
  const abKey = buildRelationshipKey(npcAId, npcBId)
  const baKey = buildRelationshipKey(npcBId, npcAId)

  const abRel = getRelationship(state.relationships, npcAId, npcBId)
  const baRel = getRelationship(state.relationships, npcBId, npcAId)

  const newAffinityAB = clamp(abRel.affinity + (outcome.axesDeltas.affinity ?? 0), 0, 100)
  const newTrustAB = clamp((abRel.trust ?? 0) + (outcome.axesDeltas.trust ?? 0), 0, 100)
  const newRespectAB = clamp((abRel.respect ?? 0) + (outcome.axesDeltas.respect ?? 0), 0, 100)
  const newLoyaltyAB = clamp((abRel.loyalty ?? 0) + (outcome.axesDeltas.loyalty ?? 0), 0, 100)

  const newAffinityBA = clamp(baRel.affinity + (outcome.axesDeltas.affinity ?? 0), 0, 100)
  const newTrustBA = clamp((baRel.trust ?? 0) + (outcome.axesDeltas.trust ?? 0), 0, 100)
  const newRespectBA = clamp((baRel.respect ?? 0) + (outcome.axesDeltas.respect ?? 0), 0, 100)
  const newLoyaltyBA = clamp((baRel.loyalty ?? 0) + (outcome.axesDeltas.loyalty ?? 0), 0, 100)

  let nextState: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [abKey]: {
        ...abRel,
        affinity: newAffinityAB,
        trust: newTrustAB,
        respect: newRespectAB,
        loyalty: newLoyaltyAB,
      },
      [baKey]: {
        ...baRel,
        affinity: newAffinityBA,
        trust: newTrustBA,
        respect: newRespectBA,
        loyalty: newLoyaltyBA,
      },
    },
  }

  // Add activity log entry
  const newLog = [...nextState.activityLog]
  newLog.push({
    id: crypto.randomUUID(),
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message: outcome.text,
  })
  nextState = {
    ...nextState,
    activityLog: newLog.slice(-100),
  }

  // Update scheduled date status
  const updatedScheduledDates = nextState.scheduledDates.map((d) =>
    d.dateId === dateId
      ? { ...d, status: 'completed' as const, outcomeId: outcome.id }
      : d,
  )
  nextState = {
    ...nextState,
    scheduledDates: updatedScheduledDates,
  }

  // Handle pregnancy for Roster NPCs at committed stage
  const abIntimacy = nextState.relationships[abKey]?.intimacyStage ?? 'none'
  if (abIntimacy === 'committed') {
    const npcA = nextState.roster.find((n) => n.npcId === npcAId)
    const npcB = nextState.roster.find((n) => n.npcId === npcBId)

    if (npcA && npcB && !npcA.pregnancyState && !npcB.pregnancyState) {
      const pregnancyKey = `date-pregnancy-${npcAId}-${npcBId}`
      if (!isOnCooldown(nextState.lastFiredDay, pregnancyKey, state.day, 30) && seed < 0.02) {
        // Pick bearer (deterministic by sort order)
        const chooseA = npcAId < npcBId
        const [bearerId, partnerId] = chooseA ? [npcAId, npcBId] : [npcBId, npcAId]

        nextState = {
          ...nextState,
          roster: nextState.roster.map((n) =>
            n.npcId === bearerId
              ? {
                  ...n,
                  pregnancyState: {
                    context: 'consensual' as const,
                    daysElapsed: 0,
                    questTag: null,
                    partnerNpcId: partnerId,
                    wanted: null,
                  },
                }
              : n,
          ),
          lastFiredDay: { ...nextState.lastFiredDay, [pregnancyKey]: state.day },
        }
      }
    }
  }

  return {
    ...nextState,
    rngSeed: seed,
  }
}

function isOnCooldown(lastFiredDay: Record<string, number>, key: string, _currentDay: number, cooldownDays: number): boolean {
  const last = lastFiredDay[key]
  return last !== undefined && _currentDay - last < cooldownDays
}

export function resolveDateWithOutcome(
  state: GameState,
  params: ResolveDateParams,
): GameState {
  return resolveDate(state, params)
}
