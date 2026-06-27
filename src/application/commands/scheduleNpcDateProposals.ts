import type { GameState } from '../../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

/**
 * Convert pending NPC-NPC date proposals into scheduled dates.
 *
 * This runs during the time slot processing phase, converting accepted proposals
 * into actual scheduled dates for the proposed day/time.
 */
export function scheduleAcceptedNpcDateProposals(state: GameState, rng: Rng): GameState {
  const today = state.day
  const acceptedProposals = state.pendingDateProposals.filter(
    (p) => p.status === 'accepted' && p.proposedDay === today + 1,
  )

  if (acceptedProposals.length === 0) return state

  let nextState = state

  for (const proposal of acceptedProposals) {
    // Verify both NPCs are still eligible
    const proposer = state.roster.find((r) => r.npcId === proposal.proposerNpcId)
    const target = state.roster.find((r) => r.npcId === proposal.targetNpcId)

    if (!proposer || !target) {
      // NPCs no longer on roster - skip this proposal
      continue
    }

    // Check if either NPC is available for the proposed time slot
    if (proposer.assignment === 'deployed' || target.assignment === 'deployed') {
      continue
    }
    if (proposer.captivityState?.status === 'captive' || target.captivityState?.status === 'captive') {
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
export function processNpcDateProposals(state: GameState, rng: Rng): GameState {
  let nextState = state

  // First, schedule accepted proposals for tomorrow
  nextState = scheduleAcceptedNpcDateProposals(nextState, rng)

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
