import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Minimum contribution threshold to claim toll rights.
 */
const MIN_TOLL_CONTRIBUTION_MONEY = 100
const MIN_TOLL_CONTRIBUTION_FOOD = 50
const MIN_TOLL_CONTRIBUTION_MATERIAL = 30

/**
 * claimTollRights: Player attempts to claim toll collection rights for a corridor group.
 *
 * Tolls can only be claimed if the player has made sufficient contributions
 * to the expedition. Success depends on contribution level relative to group progress.
 *
 * @param state - Current game state
 * @param groupId - ID of the corridor group to claim toll rights for
 * @returns Updated game state
 */
export function claimTollRights(
  state: GameState,
  groupId: string
): GameState {
  // Find the corridor group
  const groupIndex = state.cityResources.activeGroups.findIndex((g) => g.id === groupId)
  if (groupIndex === -1) {
    return state
  }

  const group = state.cityResources.activeGroups[groupIndex]

  // Check group has player contribution
  const contribution = group.playerContribution
  if (!contribution) {
    return state
  }

  // Check minimum contribution thresholds
  const hasSufficientContribution =
    contribution.money >= MIN_TOLL_CONTRIBUTION_MONEY ||
    contribution.food >= MIN_TOLL_CONTRIBUTION_FOOD ||
    contribution.material >= MIN_TOLL_CONTRIBUTION_MATERIAL

  if (!hasSufficientContribution) {
    return state
  }

  // Check group already has toll rights holder
  if (group.tollRights) {
    return state
  }

  // Calculate toll rate based on contribution
  const totalContribution = contribution.money + contribution.food * 2 + contribution.material * 5
  let tollRate = 10 // Base rate

  if (totalContribution >= 500) {
    tollRate = 25
  } else if (totalContribution >= 200) {
    tollRate = 15
  }

  // Claim toll rights
  const updatedGroups = [...state.cityResources.activeGroups]
  updatedGroups[groupIndex] = {
    ...group,
    tollRights: {
      holder: 'player',
      rate: tollRate,
    },
  }

  const next = {
    ...state,
    cityResources: {
      ...state.cityResources,
      activeGroups: updatedGroups,
    },
  }

  // Log the action
  return appendActivityLogEntry(
    next,
    'economy',
    `You claim toll collection rights at ${tollRate}% for your contribution to the corridor expedition.`,
  )
}
