import type { GameState } from '../../domain/game/contracts'
import { getRelationship, buildRelationshipKey } from '../../domain/relationships/contracts'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { NPC_INTIMACY_ADVANCE_CONDITIONS } from './applyNpcPairing'

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function pickOutcomeWithRng(outcomes: DateOutcome[], rng: Rng): DateOutcome {
  const index = Math.floor(rng() * outcomes.length)
  return outcomes[index] ?? outcomes[0]!
}

function calculateReward(rng: Rng, min: number, max: number): number {
  return Math.round(min + rng() * (max - min))
}

/**
 * Resolve a date between two NPCs (not involving the player).
 *
 * This updates the relationship axes between both NPCs based on the date outcome.
 * The player sees an activity log entry when the date completes.
 */
export function resolveNpcDate(
  state: GameState,
  dateId: string,
  rng: Rng,
): GameState {
  const scheduledDate = state.scheduledDates.find((d) => d.dateId === dateId)
  if (!scheduledDate) {
    return state
  }

  // Verify this is an NPC-NPC date (not player-involved)
  if (scheduledDate.npcIds.includes('player')) {
    return state
  }

  const dateTemplateId = scheduledDate.dateTemplateId
  const template = contentCatalog.datesById.get(dateTemplateId)

  if (!template) {
    return state
  }

  if (scheduledDate.npcIds.length < 2) {
    return state
  }

  const npcAId = scheduledDate.npcIds[0]!
  const npcBId = scheduledDate.npcIds[1]!

  const npcA = contentCatalog.npcsById.get(npcAId)
  const npcB = contentCatalog.npcsById.get(npcBId)

  if (!npcA || !npcB) {
    return state
  }

  // Pick outcome using seeded RNG
  const outcome = pickOutcomeWithRng(template.outcomes, rng)

  // Get current relationship (bidirectional)
  const ab = getRelationship(state.relationships, npcAId, npcBId)
  const ba = getRelationship(state.relationships, npcBId, npcAId)

  // Calculate relationship deltas for both directions
  const affinityDelta = outcome.axesDeltas.affinity ?? 0
  const trustDelta = outcome.axesDeltas.trust ?? 0
  const respectDelta = outcome.axesDeltas.respect ?? 0
  const loyaltyDelta = outcome.axesDeltas.loyalty ?? 0

  // Apply relationship rewards from template
  const affinityReward = calculateReward(rng, template.relationshipRewards.affinity.min, template.relationshipRewards.affinity.max)
  const trustReward = template.relationshipRewards.trust
    ? calculateReward(rng, template.relationshipRewards.trust.min, template.relationshipRewards.trust.max)
    : 0
  const respectReward = template.relationshipRewards.respect
    ? calculateReward(rng, template.relationshipRewards.respect.min, template.relationshipRewards.respect.max)
    : 0
  const loyaltyReward = template.relationshipRewards.loyalty
    ? calculateReward(rng, template.relationshipRewards.loyalty.min, template.relationshipRewards.loyalty.max)
    : 0

  // Combine outcome deltas with template rewards
  const totalAffinityDelta = affinityDelta + affinityReward
  const totalTrustDelta = trustDelta + trustReward
  const totalRespectDelta = respectDelta + respectReward
  const totalLoyaltyDelta = loyaltyDelta + loyaltyReward

  // Update both directed edges (NPC relationships are directed but should be symmetric for dating)
  const newAb = {
    ...ab,
    affinity: clamp(ab.affinity + totalAffinityDelta, -100, 100),
    trust: clamp((ab.trust ?? 0) + totalTrustDelta, -100, 100),
    respect: clamp((ab.respect ?? 0) + totalRespectDelta, -100, 100),
    loyalty: clamp((ab.loyalty ?? 0) + totalLoyaltyDelta, -100, 100),
  }

  const newBa = {
    ...ba,
    affinity: clamp(ba.affinity + totalAffinityDelta, -100, 100),
    trust: clamp((ba.trust ?? 0) + totalTrustDelta, -100, 100),
    respect: clamp((ba.respect ?? 0) + totalRespectDelta, -100, 100),
    loyalty: clamp((ba.loyalty ?? 0) + totalLoyaltyDelta, -100, 100),
  }

  // Check for intimacy stage advancement
  const currentIntimacy = getNpcNpcIntimacyStageForUpdate(state, npcAId, npcBId)
  const newIntimacy = maybeAdvanceNpcNpcIntimacy(
    newAb,
    newBa,
    currentIntimacy,
    rng,
  )

  // Build activity log message
  const message = `${npcA.name} and ${npcB.name} ${outcome.text.toLowerCase()}`

  // Mark date as completed
  const updatedScheduledDates = state.scheduledDates.map((d) =>
    d.dateId === dateId
      ? { ...d, status: 'completed' as const, outcomeId: outcome.id }
      : d,
  )

  return {
    ...state,
    relationships: {
      ...state.relationships,
      [buildRelationshipKey(npcAId, npcBId)]: newIntimacy !== currentIntimacy
        ? { ...newAb, intimacyStage: newIntimacy }
        : newAb,
      [buildRelationshipKey(npcBId, npcAId)]: newIntimacy !== currentIntimacy
        ? { ...newBa, intimacyStage: newIntimacy }
        : newBa,
    },
    scheduledDates: updatedScheduledDates,
    activityLog: [...state.activityLog, {
      id: `npc-date-${dateId}-${state.day}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system' as const,
      message,
    }].slice(-100),
  }
}

function getNpcNpcIntimacyStageForUpdate(
  state: GameState,
  npcAId: string,
  npcBId: string,
): 'none' | 'affinity' | 'attachment' | 'committed' {
  const ab = getRelationship(state.relationships, npcAId, npcBId)
  const ba = getRelationship(state.relationships, npcBId, npcAId)

  const stages: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']
  const abIndex = stages.indexOf(ab.intimacyStage ?? 'none')
  const baIndex = stages.indexOf(ba.intimacyStage ?? 'none')

  return stages[Math.min(abIndex, baIndex)] ?? 'none'
}

function maybeAdvanceNpcNpcIntimacy(
  ab: { affinity: number; trust: number; loyalty?: number },
  ba: { affinity: number; trust: number; loyalty?: number },
  currentStage: 'none' | 'affinity' | 'attachment' | 'committed',
  rng: Rng,
): 'none' | 'affinity' | 'attachment' | 'committed' {
  if (currentStage === 'committed') return 'committed'

  const stages: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']
  const currentIndex = stages.indexOf(currentStage)
  const nextStage = stages[currentIndex + 1]

  if (!nextStage) return currentStage

  // Calculate averages
  const avgAffinity = (ab.affinity + ba.affinity) / 2
  const avgTrust = ((ab.trust ?? 0) + (ba.trust ?? 0)) / 2
  const avgLoyalty = ((ab.loyalty ?? 0) + (ba.loyalty ?? 0)) / 2

  // Check thresholds for advancement
  const required = NPC_INTIMACY_ADVANCE_CONDITIONS[nextStage]
  if (!required) return currentStage

  if (avgAffinity >= required.affinity &&
      avgTrust >= required.trust &&
      (required.loyalty === undefined || avgLoyalty >= required.loyalty)) {
    // 50% chance to advance on successful date
    if (rng() < 0.5) {
      return nextStage
    }
  }

  return currentStage
}

/**
 * Resolve all scheduled NPC-NPC dates for the current time slot.
 */
export function resolveAllNpcDatesForCurrentSlot(
  state: GameState,
  rng: Rng,
): GameState {
  const datesToResolve = state.scheduledDates.filter(
    (d) =>
      d.status === 'scheduled' &&
      !d.npcIds.includes('player') &&
      d.scheduledDay === state.day &&
      d.scheduledTimeSlot === state.timeSlot,
  )

  let nextState = state

  for (const date of datesToResolve) {
    nextState = resolveNpcDate(nextState, date.dateId, rng)
  }

  return nextState
}
