import type { GameState } from '../../domain/game/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'

/**
 * Result of applying opponent pressure: list of quests that received a 'pressured' beat.
 */
export type PressuredQuest = {
  questId: string
  beatLabel: string
  beatJournalEntry: string
}

/**
 * Pure function: returns list of quests that received opponent pressure this day.
 * Called from endDay with injected random values for testability.
 *
 * For each active quest with an enemy (npc or faction), with probability 0.15:
 * - If quest stage is 'accepted', 'on-site', or 'on-site-prep'
 * - And no 'pressured' beat has been applied yet
 * - And the template has a 'pressured' beat defined
 * Then apply the beat: set stageId='pressured', append journal entry, increment requiredSteps
 */
export function applyOpponentPressure(state: GameState, randoms: number[]): PressuredQuest[] {
  const pressured: PressuredQuest[] = []
  const randomsUsed: number[] = []

  for (const quest of state.activeQuests) {
    const template = getQuestTemplates().find((t) => t.id === quest.questId)
    if (!template) continue

    // Check if quest has an opponent
    const hasOpponent = template.enemyNpcId != null || template.enemyFactionId != null
    if (!hasOpponent) continue

    // Check if quest is in a stage that can be pressured
    const pressureStages = ['accepted', 'on-site', 'on-site-prep']
    if (!pressureStages.includes(quest.stageId)) continue

    // Check if 'pressured' beat already applied (idempotency)
    const alreadyPressured = quest.journalEntries.some((entry) =>
      template.midQuestBeats?.some((beat) => beat.atStageId === 'pressured' && entry === beat.journalEntry)
    )
    if (alreadyPressured) continue

    // Check if template has a 'pressured' beat
    const pressuredBeat = template.midQuestBeats?.find((beat) => beat.atStageId === 'pressured')
    if (!pressuredBeat) continue

    // Roll for pressure (0.15 probability)
    const roll = randoms[randomsUsed.length] ?? 0.5
    randomsUsed.push(roll)

    if (roll < 0.15) {
      // Apply the pressure
      quest.stageId = 'pressured'
      quest.journalEntries.push(pressuredBeat.journalEntry)
      quest.progress.requiredSteps += 1

      pressured.push({
        questId: quest.questId,
        beatLabel: pressuredBeat.label,
        beatJournalEntry: pressuredBeat.journalEntry,
      })
    }
  }

  return pressured
}

/**
 * Apply the pressure results to the activity log.
 * This mutates the state in place (called from endDay pipeline).
 */
export function logOpponentPressure(state: GameState, pressured: PressuredQuest[]): void {
  for (const { questId, beatLabel } of pressured) {
    const template = getQuestTemplates().find((t) => t.id === questId)
    const questTitle = template?.title ?? questId
    // Directly mutate the activity log (same pattern as endDay.ts)
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-opponent-pressure`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `${questTitle}: ${beatLabel}`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) {
      state.activityLog.pop()
    }
  }
}
