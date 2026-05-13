import type { GameState } from '../../domain'
import type { QuestAftermath, QuestClue, QuestParticipant } from '../../domain/quests/contracts'

/**
 * Mark a clue as discovered on the given quest.
 * No-op if clue does not exist or is already discovered.
 */
export function discoverQuestClue(state: GameState, questId: string, clueId: string): GameState {
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  if (questIndex === -1) return state

  const runtime = state.activeQuests[questIndex]!
  const clueIndex = runtime.clues.findIndex((c) => c.clueId === clueId)
  if (clueIndex === -1 || runtime.clues[clueIndex]!.discovered) return state

  const updatedClue: QuestClue = {
    ...runtime.clues[clueIndex]!,
    discovered: true,
    discoveredOnDay: state.day,
  }
  const updatedClues = runtime.clues.map((c, i) => (i === clueIndex ? updatedClue : c))
  const updatedRuntime = {
    ...runtime,
    clues: updatedClues,
    journalEntries: [
      ...runtime.journalEntries,
      `Clue uncovered: ${updatedClue.label}`,
    ],
  }

  return {
    ...state,
    activeQuests: state.activeQuests.map((q, i) => (i === questIndex ? updatedRuntime : q)),
  }
}

/**
 * Add a participant to an active quest.
 * No-op if the npcId is already present.
 */
export function addQuestParticipant(state: GameState, questId: string, participant: QuestParticipant): GameState {
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  if (questIndex === -1) return state

  const runtime = state.activeQuests[questIndex]!
  if (runtime.participants.some((p) => p.npcId === participant.npcId)) return state

  const updatedRuntime = {
    ...runtime,
    participants: [...runtime.participants, participant],
  }

  return {
    ...state,
    activeQuests: state.activeQuests.map((q, i) => (i === questIndex ? updatedRuntime : q)),
  }
}

/**
 * Update the status of a participant in an active quest.
 */
export function updateParticipantStatus(
  state: GameState,
  questId: string,
  npcId: string,
  status: QuestParticipant['status'],
): GameState {
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  if (questIndex === -1) return state

  const runtime = state.activeQuests[questIndex]!
  const updatedRuntime = {
    ...runtime,
    participants: runtime.participants.map((p) =>
      p.npcId === npcId ? { ...p, status } : p,
    ),
  }

  return {
    ...state,
    activeQuests: state.activeQuests.map((q, i) => (i === questIndex ? updatedRuntime : q)),
  }
}

/**
 * Attach aftermath data to an active quest (typically called just before settlement).
 */
export function setQuestAftermath(state: GameState, questId: string, aftermath: QuestAftermath): GameState {
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  if (questIndex === -1) return state

  const updatedRuntime = {
    ...state.activeQuests[questIndex]!,
    aftermath,
  }

  return {
    ...state,
    activeQuests: state.activeQuests.map((q, i) => (i === questIndex ? updatedRuntime : q)),
  }
}
