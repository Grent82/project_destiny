import type {
  DateProposal,
  DateRejectionReason,
  GameState,
} from '../../domain/game/contracts'
import { getRelationship } from '../../domain/relationships/contracts'

export interface DateProposalParams {
  proposerNpcId: string
  targetNpcId: string
  dateTemplateId: string
  proposedDay: number
  proposedTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night'
  proposedLocation: string | null
}

export interface ProposeDateResult {
  success: boolean
  proposal?: DateProposal
  rejectionReason?: DateRejectionReason
  message: string
}

const COOLDOWN_DAYS_AFTER_DATE = 2
const MIN_INTIMACY_FOR_PROPOSAL: Record<string, number> = {
  'date-quiet-walk': 1, // affinity
  'date-shared-meal': 1,
  'date-music-night': 2, // attachment
  'date-workshop-project': 1,
  'date-private-ritual': 3, // committed
  'date-district-exploration': 2,
  'date-quiet-morning': 2,
}

function getIntimacyStageIndex(stage: string): number {
  const stages = ['none', 'affinity', 'attachment', 'committed']
  return stages.indexOf(stage)
}

function getNpcIntimacyStage(state: GameState, npcId: string): string {
  const key = `player→${npcId}`
  const relationship = state.relationships[key]
  if (!relationship) return 'none'
  return relationship.intimacyStage ?? 'none'
}

function checkProposalEligibility(
  state: GameState,
  _proposerId: string,
  targetId: string,
  dateTemplateId: string,
  proposedDay: number,
  proposedTimeSlot: string,
): { eligible: boolean; reason?: DateRejectionReason; message?: string } {
  // proposedTimeSlot reserved for future time-based availability checks
  void proposedTimeSlot
  const targetIntimacy = getNpcIntimacyStage(state, targetId)
  const requiredStage = MIN_INTIMACY_FOR_PROPOSAL[dateTemplateId] ?? 1
  const currentStageIndex = getIntimacyStageIndex(targetIntimacy)

  if (currentStageIndex < requiredStage) {
    return {
      eligible: false,
      reason: 'too-soon',
      message: 'The relationship is not deep enough yet for this kind of encounter.',
    }
  }

  const targetNpc = state.roster.find((n) => n.npcId === targetId)
  if (!targetNpc) {
    return {
      eligible: false,
      reason: 'not-ready',
      message: 'That person is not available.',
    }
  }

  if (targetNpc.assignment !== 'idle' && targetNpc.assignment !== 'working') {
    return {
      eligible: false,
      reason: 'busy',
      message: 'They are occupied with other duties.',
    }
  }

  const lastContactDay = targetNpc.npcMemory
    .filter((m) => m.event.includes('date') || m.event.includes('encounter'))
    .pop()?.day

  if (lastContactDay && proposedDay - lastContactDay < COOLDOWN_DAYS_AFTER_DATE) {
    return {
      eligible: false,
      reason: 'too-soon',
      message: 'It feels too soon. A little space would be wise.',
    }
  }

  const cooldownKey = `${targetId}-${proposedDay}`
  if (state.npcDateCooldowns[cooldownKey]) {
    return {
      eligible: false,
      reason: 'too-soon',
      message: 'They already have plans for that time.',
    }
  }

  const relationship = getRelationship(state.relationships, 'player', targetId)
  const affinityThreshold = requiredStage === 3 ? 70 : requiredStage === 2 ? 50 : 30
  if (relationship.affinity < affinityThreshold) {
    return {
      eligible: false,
      reason: 'incompatibility',
      message: 'The timing does not feel right. They seem hesitant.',
    }
  }

  return { eligible: true }
}

export function proposeDate(
  state: GameState,
  params: DateProposalParams,
): GameState {
  const { proposerNpcId, targetNpcId, dateTemplateId, proposedDay, proposedTimeSlot, proposedLocation } = params

  const eligibility = checkProposalEligibility(
    state,
    proposerNpcId,
    targetNpcId,
    dateTemplateId,
    proposedDay,
    proposedTimeSlot,
  )

  if (!eligibility.eligible) {
    const newLog = [...state.activityLog]
    newLog.push({
      id: crypto.randomUUID(),
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `Date proposal declined: ${eligibility.message}`,
    })

    return {
      ...state,
      activityLog: newLog.slice(-100),
    }
  }

  const proposal: DateProposal = {
    proposalId: `proposal-${crypto.randomUUID()}`,
    proposerNpcId,
    targetNpcId,
    dateTemplateId,
    proposedDay,
    proposedTimeSlot,
    proposedLocation,
    status: 'accepted',
    rejectionReason: null,
    proposedAtDay: state.day,
  }

  const cooldownKey = `${targetNpcId}-${proposedDay}`
  const newCooldowns = {
    ...state.npcDateCooldowns,
    [cooldownKey]: proposedDay,
  }

  const newLog = [...state.activityLog]
  newLog.push({
    id: crypto.randomUUID(),
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message: `Date planned: ${proposedTimeSlot} of day ${proposedDay}`,
  })

  return {
    ...state,
    pendingDateProposals: [...state.pendingDateProposals, proposal],
    npcDateCooldowns: newCooldowns,
    activityLog: newLog.slice(-100),
  }
}

export function proposeDateWithPlayer(
  state: GameState,
  params: Omit<DateProposalParams, 'proposerNpcId'>,
): GameState {
  return proposeDate(state, { ...params, proposerNpcId: 'player' })
}
