import type { GameState } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'

/**
 * advanceCorridorRunQuest: Dispatches a corridor run quest with the selected squad.
 *
 * Updates the quest stage to 'in-progress' and logs the dispatch to the activity log.
 *
 * @param state - Current game state
 * @param questId - ID of the corridor-run quest to advance
 * @param squadNpcIds - IDs of NPCs in the dispatch squad
 * @returns Updated game state with quest stage advanced
 */
export function advanceCorridorRunQuest(
  state: GameState,
  questId: string,
  squadNpcIds: string[],
): GameState {
  // Find the corridor-run quest
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  if (questIndex === -1) {
    return state
  }

  const quest = state.activeQuests[questIndex]

  // Check if this is a corridor-run quest (check questId pattern as primary check)
  const isCorridorRun = questId.includes('corridor')
  if (!isCorridorRun) {
    return state
  }

  // Update quest stage to in-progress
  const updatedQuests = [...state.activeQuests]
  updatedQuests[questIndex] = {
    ...quest,
    stageId: 'in-progress',
    progress: {
      ...quest.progress,
      completedSteps: 1,
    },
  }

  // Build squad member names for activity log
  const squadNames = squadNpcIds
    .map((id) => {
      const rosterEntry = state.npcRuntimeStates.find((r) => r.npcId === id)
      return rosterEntry?.name ?? id
    })
    .join(', ')

  const next = {
    ...state,
    activeQuests: updatedQuests,
  }

  return appendActivityLogEntry(
    next,
    'system',
    `Corridor run dispatched with ${squadNpcIds.length} operatives: ${squadNames}.`,
  )
}
