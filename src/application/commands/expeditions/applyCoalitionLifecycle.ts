import type { GameState } from '../../../domain/game/contracts'
import type { CoalitionStatus } from '../../../domain/expedition/contracts'
import { publishEvent } from '../events/publishEvent'

/**
 * Transition a coalition to a new status.
 */
function transitionCoalitionStatus(
  coalition: GameState['cityResources']['activeCoalitions'][number],
  newStatus: CoalitionStatus
): GameState['cityResources']['activeCoalitions'][number] {
  return {
    ...coalition,
    status: newStatus,
  }
}

/**
 * Simulate a day of expedition progress for a coalition.
 */
function advanceCoalitionProgress(
  coalition: GameState['cityResources']['activeCoalitions'][number],
  rng: () => number
): GameState['cityResources']['activeCoalitions'][number] {
  // Base progress per day: 10-20% depending on difficulty
  const baseProgress = 10 + Math.floor(rng() * 10)
  const difficultyModifier = Math.max(0.3, 1 - coalition.difficulty / 20)
  const dailyProgress = Math.floor(baseProgress * difficultyModifier)

  const newProgress = Math.min(100, coalition.progress + dailyProgress)

  return {
    ...coalition,
    progress: newProgress,
  }
}

/**
 * applyCoalitionLifecycle: Processes daily coalition state transitions.
 *
 * Called each day in endDay orchestration.
 *
 * Lifecycle:
 * - forming -> departed: After 2 days in forming status
 * - departed -> active: Immediately (expedition begins)
 * - active -> returning: When progress reaches 100%
 * - returning -> concluded: After 1 day (coalition returns)
 *
 * @param state - Current game state
 * @param rng - Seeded RNG function
 * @returns Updated game state with processed coalitions
 */
export function applyCoalitionLifecycle(
  state: GameState,
  rng: () => number
): GameState {
  let next = state
  const coalitions = [...state.cityResources.activeCoalitions]

  for (let i = 0; i < coalitions.length; i++) {
    const coalition = coalitions[i]
    const daysSinceFormation = state.day - coalition.formedDay

    switch (coalition.status) {
      case 'forming':
        // Transition to departed after 2 days
        if (daysSinceFormation >= 2) {
          coalitions[i] = transitionCoalitionStatus(coalition, 'departed')

          next = publishEvent(
            next,
            'expedition-started',
            {
              coalitionId: coalition.id,
              targetSegment: coalition.targetSegment,
              difficulty: coalition.difficulty,
            },
            'npc',
            {
              relatedNpcIds: coalition.members.map((m: { npcId: string }) => m.npcId),
              activityLogMessage: `The corridor coalition has departed on their mission.`,
              activityLogCategory: 'system',
            }
          )
        }
        break

      case 'departed':
      case 'active': {
        // Advance progress
        const updatedCoalition = advanceCoalitionProgress(coalition, rng)
        coalitions[i] = updatedCoalition

        // Check if expedition succeeded (use updated progress)
        if (updatedCoalition.progress >= 100) {
          // Update corridor status
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              corridorStatus: 'disrupted',
              corridorClearanceProgressDays: 0,
            },
          }

          // Move to history immediately (coalition returns at end of day)
          const returnedCoalition = transitionCoalitionStatus(updatedCoalition, 'returning')

          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              activeCoalitions: next.cityResources.activeCoalitions.filter((_concluded, idx: number) => idx !== i),
              coalitionHistory: [...next.cityResources.coalitionHistory, returnedCoalition],
            },
          }

          next = publishEvent(
            next,
            'expedition-complete',
            {
              coalitionId: coalition.id,
              success: true,
              progress: 100,
            },
            'npc',
            {
              relatedNpcIds: coalition.members.map((m: { npcId: string }) => m.npcId),
              activityLogMessage: undefined,
            }
          )

          next = publishEvent(
            next,
            'corridor-disrupted',
            {
              source: 'coalition',
              coalitionId: coalition.id,
            },
            'npc',
            {
              relatedNpcIds: coalition.members.map((m: { npcId: string }) => m.npcId),
              activityLogMessage: 'The corridor coalition returns! The Green Corridor is partially reopened.',
              activityLogCategory: 'economy',
            }
          )

          next = publishEvent(
            next,
            'coalition-dissolved',
            {
              coalitionId: coalition.id,
              outcome: 'success',
            },
            'system',
            {
              relatedNpcIds: coalition.members.map((m: { npcId: string }) => m.npcId),
              activityLogMessage: undefined,
            }
          )
        }
        break
      }

      case 'returning': {
        // Coalition returns - move to history
        const returnedCoalition = coalitions[i]

        // Update corridor status based on success
        if (returnedCoalition.progress >= 100) {
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              corridorStatus: 'disrupted',
              corridorClearanceProgressDays: 0,
            },
          }

          next = publishEvent(
            next,
            'corridor-disrupted',
            {
              source: 'coalition',
              coalitionId: returnedCoalition.id,
            },
            'npc',
            {
              relatedNpcIds: returnedCoalition.members.map((m: { npcId: string }) => m.npcId),
              activityLogMessage: 'The corridor coalition returns! The Green Corridor is partially reopened.',
              activityLogCategory: 'economy',
            }
          )
        }

        // Add to history, remove from active
        // Mark coalition as concluded so it gets filtered out in the final cleanup
        coalitions[i] = { ...returnedCoalition, status: 'concluded' as const }

        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            coalitionHistory: [...next.cityResources.coalitionHistory, returnedCoalition],
          },
        }

        next = publishEvent(
          next,
          'coalition-dissolved',
          {
            coalitionId: returnedCoalition.id,
            outcome: returnedCoalition.progress >= 100 ? 'success' : 'partial',
          },
          'system',
          {
            relatedNpcIds: returnedCoalition.members.map((m: { npcId: string }) => m.npcId),
            activityLogMessage: undefined,
          }
        )
        break
      }

      case 'concluded': {
        // Already concluded, just remove from active
        const concludedCoalition = coalitions[i]
        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            activeCoalitions: next.cityResources.activeCoalitions.filter((_concluded, idx: number) => idx !== i),
            coalitionHistory: [...next.cityResources.coalitionHistory, concludedCoalition],
          },
        }
        break
      }
    }
  }

  // Final update: sync coalitions array to state, filtering out concluded ones
  // 'returning' coalitions have already been moved to history in the switch statement
  next = {
    ...next,
    cityResources: {
      ...next.cityResources,
      activeCoalitions: coalitions.filter((c) => c.status !== 'concluded'),
    },
  }

  return next
}
