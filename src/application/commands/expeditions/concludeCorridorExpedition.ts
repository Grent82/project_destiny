import type { GameState } from '../../../domain/game/contracts'
import { publishEvent } from '../events/publishEvent'

/**
 * Distribute loot to coalition members based on their contribution.
 */
function distributeLoot(
  coalition: GameState['cityResources']['activeCoalitions'][number],
  lootItems: string[],
  rng: () => number
): Record<string, string[]> {
  const distribution: Record<string, string[]> = {}

  // Sort members by contribution (highest first)
  const sortedMembers = [...coalition.members].sort((a, b) => b.contribution - a.contribution)
  const totalMembers = sortedMembers.length

  if (totalMembers === 0) return distribution

  // Distribute loot - higher contribution = better chance
  for (const item of lootItems) {
    // Find best available recipient
    for (const member of sortedMembers) {
      // Base chance + contribution bonus
      const baseChance = 0.3
      const contributionBonus = Math.min(0.5, coalition.members.find(m => m.npcId === member.npcId)?.contribution ? coalition.members.find(m => m.npcId === member.npcId)!.contribution / 500 : 0)
      const roll = rng()

      if (roll < baseChance + contributionBonus) {
        if (!distribution[member.npcId]) {
          distribution[member.npcId] = []
        }
        distribution[member.npcId].push(item)
        break
      }
    }
  }

  return distribution
}

/**
 * concludeCorridorExpedition: Finalizes an expedition and handles outcomes.
 *
 * This command:
 * - Distributes loot to surviving coalition members
 * - Handles casualties (marks NPCs as dead/injured)
 * - Updates corridor status based on expedition success
 * - Publishes events for downstream systems
 *
 * @param state - Current game state
 * @param coalitionId - ID of the coalition whose expedition to conclude
 * @param success - Whether the expedition was successful
 * @param rng - Seeded RNG function
 * @returns Updated game state with expedition concluded
 */
export function concludeCorridorExpedition(
  state: GameState,
  coalitionId: string,
  success: boolean,
  rng: () => number
): GameState {
  const coalitionIndex = state.cityResources.activeCoalitions.findIndex(c => c.id === coalitionId)
  if (coalitionIndex === -1) {
    return state
  }

  const coalition = state.cityResources.activeCoalitions[coalitionIndex]
  if (!coalition) {
    return state
  }

  let next = state

  // Handle loot distribution if successful
  let lootDistribution: Record<string, string[]> = {}
  if (success) {
    const lootItems = ['item-supply-pack', 'item-medkit', 'item-weapon-scrap', 'item-armor-scrap']
    lootDistribution = distributeLoot(coalition, lootItems, rng)
  }

  // Handle casualties
  const casualties = success ? [] : coalition.members.filter(() => rng() > 0.7).map(member => ({
    npcId: member.npcId,
    status: rng() > 0.5 ? 'dead' as const : 'injured' as const,
  }))

  // Update corridor status based on success
  if (success && coalition.progress >= 100) {
    // Corridor cleared - change status to disrupted
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        corridorStatus: 'disrupted' as const,
        corridorClearanceProgressDays: 0,
      },
    }

    next = publishEvent(
      next,
      'corridor-disrupted',
      {
        source: 'coalition',
        coalitionId: coalition.id,
        expeditionSuccess: true,
      },
      'npc',
      {
        relatedNpcIds: coalition.members.map(m => m.npcId),
        activityLogMessage: 'The corridor expedition returns victorious! The Green Corridor is partially reopened.',
        activityLogCategory: 'economy',
      }
    )
  } else if (success) {
    // Partial success - just log progress
    next = publishEvent(
      next,
      'coalition-progress',
      {
        coalitionId: coalition.id,
        progress: coalition.progress,
      },
      'npc',
      {
        relatedNpcIds: coalition.members.map(m => m.npcId),
        activityLogMessage: undefined,
      }
    )
  } else {
    // Failure - corridor remains blocked
    next = publishEvent(
      next,
      'coalition-dissolved',
      {
        coalitionId: coalition.id,
        outcome: 'failure',
        casualties: casualties.length,
      },
      'system',
      {
        relatedNpcIds: coalition.members.map(m => m.npcId),
        activityLogMessage: 'The corridor expedition has failed. Some did not return.',
        activityLogCategory: 'system',
      }
    )
  }

  // Publish loot distribution event
  if (success && Object.keys(lootDistribution).length > 0) {
    next = publishEvent(
      next,
      'loot-distributed',
      {
        coalitionId: coalition.id,
        distribution: lootDistribution,
      },
      'system',
      {
        relatedNpcIds: coalition.members.map(m => m.npcId),
        activityLogMessage: undefined,
      }
    )
  }

  // Publish casualty event if any
  if (casualties.length > 0) {
    next = publishEvent(
      next,
      'coalition-casualties',
      {
        coalitionId: coalition.id,
        casualties,
      },
      'system',
      {
        relatedNpcIds: casualties.map(c => c.npcId),
        activityLogMessage: undefined,
      }
    )
  }

  return next
}
