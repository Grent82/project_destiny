import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'

/**
 * joinCorridorExpedition: Player adds a roster NPC to an active corridor group.
 *
 * This allows the player to directly contribute personnel to corridor clearance
 * efforts. The NPC will be temporarily unavailable for other tasks.
 *
 * @param state - Current game state
 * @param groupId - ID of the corridor group to join
 * @param npcId - ID of the roster NPC to send
 * @returns Updated game state
 */
export function joinCorridorExpedition(
  state: GameState,
  groupId: string,
  npcId: string
): GameState {
  // Find the corridor group
  const groupIndex = state.cityResources.activeGroups.findIndex((g) => g.id === groupId)
  if (groupIndex === -1) {
    return state
  }

  const group = state.cityResources.activeGroups[groupIndex]

  // Find the NPC in the roster
  const npcIndex = state.roster.findIndex((r) => r.npcId === npcId)
  if (npcIndex === -1) {
    return state
  }

  const npc = state.roster[npcIndex]

  // Check NPC is available (idle, not on directive)
  if (npc.assignment !== 'idle' || npc.currentDirectiveId !== null) {
    return state
  }

  // Check NPC is not already in this expedition
  if (group.playerContribution?.joinedNpcIds.includes(npcId)) {
    return state
  }

  // Check group has room (max 5 members)
  const currentMemberCount = group.members.length + (group.playerContribution?.joinedNpcIds.length ?? 0)
  if (currentMemberCount >= 5) {
    return state
  }

  // Update NPC assignment to deployed
  let next = {
    ...state,
    roster: [
      ...state.roster.slice(0, npcIndex),
      {
        ...npc,
        assignment: 'deployed' as const,
      },
      ...state.roster.slice(npcIndex + 1),
    ],
  }

  // Add NPC to group's player contribution
  const playerContribution = group.playerContribution ?? {
    food: 0,
    money: 0,
    material: 0,
    joinedNpcIds: [],
  }

  const updatedContribution = {
    ...playerContribution,
    joinedNpcIds: [...playerContribution.joinedNpcIds, npcId],
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

  // Log the action
  next = appendActivityLogEntry(
    next,
    'system',
    `You sent ${npc.name} to join the corridor expedition.`,
  )

  return next
}
