import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

interface DateParticipant {
  assignment?: string
  captivityStatus?: string
}

/**
 * Resolve a date-proposal participant to their eligibility-relevant state.
 * Recognizes the player (always eligible), Roster NPCs (assignment/captivity gated),
 * and World NPCs (always eligible, no assignment/captivity concept) — the same three
 * participant kinds generateNpcDateProposals.ts already supports. Returns null if the
 * participant no longer exists in any of those pools.
 */
function findDateParticipant(state: GameState, npcId: string): DateParticipant | null {
  if (npcId === 'player') return {}
  const roster = state.roster.find((r) => r.npcId === npcId)
  if (roster) return { assignment: roster.assignment, captivityStatus: roster.captivityState?.status }
  const world = state.worldNpcStates.find((w) => w.npcId === npcId)
  if (world) return {}
  return null
}

/**
 * Convert pending NPC-NPC date proposals into scheduled dates.
 *
 * This runs during the time slot processing phase, converting accepted proposals
 * into actual scheduled dates for the proposed day/time.
 */
export function scheduleAcceptedNpcDateProposals(state: GameState): GameState {
  const today = state.day
  const acceptedProposals = state.pendingDateProposals.filter(
    (p) => p.status === 'accepted' && p.proposedDay === today + 1,
  )

  if (acceptedProposals.length === 0) return state

  let nextState = state

  for (const proposal of acceptedProposals) {
    // Verify both participants are still eligible (player, Roster NPC, or World NPC)
    const proposer = findDateParticipant(state, proposal.proposerNpcId)
    const target = findDateParticipant(state, proposal.targetNpcId)

    if (!proposer || !target) {
      // Participant no longer exists - skip this proposal
      continue
    }

    // Check if either NPC is available for the proposed time slot
    if (proposer.assignment === 'deployed' || target.assignment === 'deployed') {
      continue
    }
    if (proposer.captivityStatus === 'captive' || target.captivityStatus === 'captive') {
      continue
    }

    // Create the scheduled date
    const dateLocation = proposal.proposedLocation
      ? {
          districtId: proposal.proposedLocation,
        }
      : {
          districtId: state.houseDistrictId, // Default to house district
        }

    const scheduledDate = {
      dateId: `npc-date-${proposal.proposerNpcId}-${proposal.targetNpcId}-${today}`,
      npcIds: [proposal.proposerNpcId, proposal.targetNpcId],
      dateTemplateId: proposal.dateTemplateId,
      scheduledDay: proposal.proposedDay,
      scheduledTimeSlot: proposal.proposedTimeSlot,
      location: dateLocation,
      status: 'scheduled' as const,
      outcomeId: null,
    }

    nextState = {
      ...nextState,
      scheduledDates: [...nextState.scheduledDates, scheduledDate],
      pendingDateProposals: nextState.pendingDateProposals.filter(
        (p) => p.proposalId !== proposal.proposalId,
      ),
    }
  }

  return nextState
}

/**
 * Process NPC-NPC date proposals: schedule accepted ones and reject those that can't happen.
 */
export function processNpcDateProposals(state: GameState): GameState {
  let nextState = state

  // First, schedule accepted proposals for tomorrow
  nextState = scheduleAcceptedNpcDateProposals(nextState)

  // Reject proposals that are now too old (older than 3 days)
  const staleProposals = nextState.pendingDateProposals.filter(
    (p) => state.day - p.proposedAtDay > 3,
  )

  for (const proposal of staleProposals) {
    const proposer = contentCatalog.npcsById.get(proposal.proposerNpcId)
    const target = contentCatalog.npcsById.get(proposal.targetNpcId)

    nextState = appendActivityLogEntry(
      nextState,
      'system',
      `${proposer?.name ?? 'An NPC'} and ${target?.name ?? 'another NPC'} could not make their date plans work this time.`,
    )
  }

  // Remove stale proposals
  nextState = {
    ...nextState,
    pendingDateProposals: nextState.pendingDateProposals.filter(
      (p) => state.day - p.proposedAtDay <= 3,
    ),
  }

  return nextState
}
