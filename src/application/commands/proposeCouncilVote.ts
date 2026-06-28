import type { GameState } from '../../domain/game/contracts'
import type { CouncilVoteEvent } from '../../domain/governance/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'

/**
 * Player proposal access mode.
 */
export type ProposalAccessMode = 'direct' | 'sponsored'

/**
 * Check if the player can propose a council vote.
 *
 * Path A — Direct: player has houseWardSeats >= 1
 * Path B — Sponsored: player has faction standing >= 50 with any faction
 */
export function canProposeCouncilVote(
  state: GameState,
  mode: ProposalAccessMode,
  sponsorFactionId?: string,
): { canPropose: boolean; reason?: string } {
  // Check cooldown first
  if (state.houseProposalCooldown > state.day) {
    return {
      canPropose: false,
      reason: `Cooldown active. Can propose again on day ${state.houseProposalCooldown}.`,
    }
  }

  if (mode === 'direct') {
    if (state.houseWardSeats < 1) {
      return {
        canPropose: false,
        reason: 'Requires at least 1 house ward seat.',
      }
    }
    return { canPropose: true }
  }

  if (mode === 'sponsored') {
    if (!sponsorFactionId) {
      return {
        canPropose: false,
        reason: 'No sponsor faction specified.',
      }
    }
    const standing = state.factionStandings[sponsorFactionId] ?? 0
    if (standing < 50) {
      return {
        canPropose: false,
        reason: `Requires faction standing >= 50 with ${sponsorFactionId}. Current: ${standing}.`,
      }
    }
    return { canPropose: true }
  }

  return {
    canPropose: false,
    reason: 'Unknown proposal mode.',
  }
}

/**
 * Check if a faction leader would approve a sponsorship request.
 *
 * Leader traits affect approval:
 * - High ambition (>65): more likely to approve (+20% chance)
 * - High prudence (>65): more likely to refuse (-15% chance)
 * - Low loyalty (<35): may refuse due to potential defection concerns (-10% chance)
 */
export function wouldLeaderApproveSponsorship(
  factionId: string,
  state: GameState,
  rng: () => number,
): { approved: boolean; reason?: string } {
  const factionState = state.factionStates.find((f) => f.factionId === factionId)
  const leaderNpcId = factionState?.leaderNpcId

  if (!leaderNpcId) {
    return { approved: false, reason: 'Faction has no leader.' }
  }

  const leader = contentCatalog.npcsById.get(leaderNpcId)
  if (!leader) {
    return { approved: false, reason: 'Leader definition not found.' }
  }

  const traits = leader.startingTraits
  let approvalChance = 0.5 // Base 50% chance

  // Trait modifiers
  if (traits.ambition > 65) approvalChance += 0.2
  if (traits.prudence > 65) approvalChance -= 0.15
  if (traits.loyalty < 35) approvalChance -= 0.1

  // Cap at 0.9 maximum
  approvalChance = Math.min(0.9, Math.max(0.1, approvalChance))

  const approved = rng() < approvalChance

  if (!approved) {
    let reason = 'Leader refused.'
    if (traits.prudence > 65) reason = 'Leader is too cautious to co-sponsor.'
    else if (traits.loyalty < 35) reason = 'Leader is unreliable and refuses to commit.'
    else if (traits.ambition <= 35) reason = 'Leader lacks ambition to engage.'

    return { approved: false, reason }
  }

  return { approved: true }
}

/**
 * proposeCouncilVote: Allows the player to initiate a council vote.
 *
 * Path A — Direct (houseWardSeats >= 1):
 * - Vote fires immediately with proposingFactionId = 'house-valdric'
 *
 * Path B — Sponsored (faction standing >= 50):
 * - Leader approval checked first
 * - If approved, vote fires under the sponsoring faction's name
 *
 * Sets houseProposalCooldown to current day + 10 to prevent spam.
 *
 * @param state - Current game state
 * @param voteTemplate - The vote template to propose
 * @param mode - 'direct' or 'sponsored'
 * @param sponsorFactionId - Required for sponsored mode
 * @param rng - Seeded RNG function
 * @returns Updated game state with new council vote (or unchanged if blocked)
 */
export function proposeCouncilVote(
  state: GameState,
  voteTemplate: CouncilVoteEvent,
  mode: ProposalAccessMode,
  sponsorFactionId?: string,
  rng: () => number = Math.random,
): GameState {
  // Check access
  const accessCheck = canProposeCouncilVote(state, mode, sponsorFactionId)
  if (!accessCheck.canPropose) {
    return appendActivityLogEntry(
      state,
      'system',
      `Cannot propose council vote: ${accessCheck.reason}`,
    )
  }

  // For sponsored mode, check leader approval
  let actualProposingFactionId = voteTemplate.proposingFactionId
  if (mode === 'sponsored' && sponsorFactionId) {
    const approval = wouldLeaderApproveSponsorship(sponsorFactionId, state, rng)
    if (!approval.approved) {
      return appendActivityLogEntry(
        state,
        'system',
        `Sponsorship request denied: ${approval.reason}`,
      )
    }
    actualProposingFactionId = sponsorFactionId
  }

  // Create the vote entry
  const currentDay = state.day
  const voteId = `${voteTemplate.id}-house-day-${currentDay}`

  const newVote: CouncilVoteEvent = {
    ...voteTemplate,
    id: voteId,
    proposingFactionId: actualProposingFactionId,
    expiresOnDay: currentDay + 7,
    outcome: 'pending',
    playerVote: null,
  }

  // Set cooldown (10 days from now)
  const newCooldown = currentDay + 10

  // Build activity log message
  const factionName = contentCatalog.factionsById.get(actualProposingFactionId)?.name ?? actualProposingFactionId
  const leaderNpcId = state.factionStates.find((f) => f.factionId === actualProposingFactionId)?.leaderNpcId
  const leaderName = leaderNpcId ? contentCatalog.npcsById.get(leaderNpcId)?.name : null
  const proposerText = leaderName ? `${leaderName} of the ${factionName}` : factionName

  const next = {
    ...state,
    activeCouncilVotes: [...state.activeCouncilVotes, newVote],
    houseProposalCooldown: newCooldown,
  }

  return appendActivityLogEntry(
    next,
    'system',
    `House Valdric proposes: "${voteTemplate.title}" via ${proposerText}.`,
  )
}
