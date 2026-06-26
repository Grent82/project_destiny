import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Type of resource the player can donate to a corridor expedition.
 */
export type ResourceKind = 'food' | 'money' | 'material'

/**
 * supplyCorridorExpedition: Player donates resources to an active corridor group.
 *
 * This allows the player to support NPC-led corridor clearance efforts and
 * earn toll rights in return.
 *
 * @param state - Current game state
 * @param groupId - ID of the corridor group to support
 * @param resourceKind - Type of resource to donate (food, money, material)
 * @param amount - Amount of resource to donate
 * @returns Updated game state
 */
export function supplyCorridorExpedition(
  state: GameState,
  groupId: string,
  resourceKind: ResourceKind,
  amount: number
): GameState {
  // Find the corridor group
  const groupIndex = state.cityResources.activeGroups.findIndex((g) => g.id === groupId)
  if (groupIndex === -1) {
    return state
  }

  const group = state.cityResources.activeGroups[groupIndex]

  // Validate amount is positive
  if (amount <= 0) {
    return state
  }

  // Check player has sufficient resources
  let canDonate = false
  switch (resourceKind) {
    case 'food':
      canDonate = state.cityResources.foodStock >= amount
      break
    case 'money':
      canDonate = state.money >= amount
      break
    case 'material':
      canDonate = state.cityResources.materialStock >= amount
      break
  }

  if (!canDonate) {
    return state
  }

  // Deduct resources from player
  let next = state
  switch (resourceKind) {
    case 'food':
      next = {
        ...next,
        cityResources: {
          ...next.cityResources,
          foodStock: next.cityResources.foodStock - amount,
        },
      }
      break
    case 'money':
      next = {
        ...next,
        money: next.money - amount,
      }
      break
    case 'material':
      next = {
        ...next,
        cityResources: {
          ...next.cityResources,
          materialStock: next.cityResources.materialStock - amount,
        },
      }
      break
  }

  // Update group's player contribution
  const playerContribution = group.playerContribution ?? {
    food: 0,
    money: 0,
    material: 0,
    joinedNpcIds: [],
  }

  const updatedContribution = {
    ...playerContribution,
    [resourceKind]: playerContribution[resourceKind] + amount,
  }

  const updatedGroups = [...next.cityResources.activeGroups]
  updatedGroups[groupIndex] = {
    ...group,
    playerContribution: updatedContribution,
  }

  next = {
    ...next,
    cityResources: {
      ...next.cityResources,
      activeGroups: updatedGroups,
    },
  }

  // Log the donation
  const resourceLabel = resourceKind === 'money' ? `${amount} marks` : `${amount} ${resourceKind}`
  next = appendActivityLogEntry(
    next,
    'economy',
    `You supplied the corridor expedition with ${resourceLabel}. Your influence grows.`,
  )

  return next
}
