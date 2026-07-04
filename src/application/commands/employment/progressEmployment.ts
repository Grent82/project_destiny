import type { GameState } from '../../../domain/game/contracts'
import { completeEmployment, failEmployment } from './completeEmployment'

// Internal progress tracking for employments (not persisted in schema)
const employmentProgressTracker = new Map<string, number>()

/**
 * Reset progress tracker - used for testing only.
 */
export function _resetEmploymentProgressTracker(): void {
  employmentProgressTracker.clear()
}

/**
 * Progresses an active employment task.
 * Calculates completion based on employee skills and task type.
 * Updates performanceHistory and handles completion/failure outcomes.
 */
export function progressEmployment(
  state: GameState,
  employmentId: string,
): GameState {
  // Find the employment
  const employmentNpc = state.npcRuntimeStates.find(
    (npc) => npc.currentEmployment?.employmentId === employmentId,
  )

  if (!employmentNpc || !employmentNpc.currentEmployment) {
    return state
  }

  const employment = employmentNpc.currentEmployment

  // Only progress in-progress employments
  if (employment.status !== 'in-progress') {
    return state
  }

  // Calculate task progress based on task type and employee skills
  const dailyProgress = calculateTaskProgress(employmentNpc, employment, state)

  // Get or initialize accumulated progress
  let accumulatedProgress = employmentProgressTracker.get(employmentId) || 0
  accumulatedProgress += dailyProgress
  employmentProgressTracker.set(employmentId, accumulatedProgress)

  // Calculate stress impact based on progress
  const stressImpact = dailyProgress > 60 ? -5 : dailyProgress < 20 ? 5 : 0

  // Update performance history
  const updatedHistory = [
    ...employment.performanceHistory,
    {
      day: state.day,
      progressAtDay: accumulatedProgress,
      stressImpact,
    },
  ]

  // Update employment or mark as completed/failed
  if (accumulatedProgress >= 100) {
    // Task completed successfully
    employmentProgressTracker.delete(employmentId)
    // Update history before completing
    let newState = updateEmploymentHistory(state, employmentNpc.npcId, updatedHistory)
    newState = completeEmployment(newState, employmentNpc.npcId)
    return newState
  } else if (employment.deadlineDay && state.day >= employment.deadlineDay) {
    // Deadline reached - check if performance threshold is met
    const threshold = employment.performanceThreshold ?? 50
    if (accumulatedProgress < threshold) {
      // Task failed - insufficient progress
      employmentProgressTracker.delete(employmentId)
      let newState = updateEmploymentHistory(state, employmentNpc.npcId, updatedHistory)
      newState = failEmployment(newState, employmentNpc.npcId, 'insufficient_progress')
      return newState
    } else {
      // Progress is sufficient, complete the employment
      employmentProgressTracker.delete(employmentId)
      let newState = updateEmploymentHistory(state, employmentNpc.npcId, updatedHistory)
      newState = completeEmployment(newState, employmentNpc.npcId)
      return newState
    }
  } else {
    // Progress updated but not complete yet - update history
    return {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((npc) =>
        npc.npcId === employmentNpc.npcId
          ? { ...npc, currentEmployment: { ...employment, performanceHistory: updatedHistory } }
          : npc,
      ),
    }
  }
}

/**
 * Updates the performance history for an employment.
 */
function updateEmploymentHistory(
  state: GameState,
  employeeId: string,
  history: Array<{ day: number; progressAtDay: number; stressImpact: number }>,
): GameState {
  const npc = state.npcRuntimeStates.find((npc) => npc.npcId === employeeId)
  if (!npc || !npc.currentEmployment) {
    return state
  }

  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((rosterNpc) =>
      rosterNpc.npcId === employeeId
        ? { ...rosterNpc, currentEmployment: { ...rosterNpc.currentEmployment!, performanceHistory: history } }
        : rosterNpc,
    ),
  }
}

/**
 * Calculates task progress percentage based on employee skills and task requirements.
 */
export function calculateTaskProgress(
  employee: { skills: Record<string, number>; traits: Record<string, number> },
  employment: { taskType: string },
  state: GameState,
): number {
  const skillValue = getSkillValueForTask(employee, employment)

  // Base progress: skill value / 100 * 50% (max 50% per day from skill)
  let progress = (skillValue / 100) * 50

  // Add bonuses from traits
  if (employment.taskType === 'scout') {
    progress += employee.traits.curiosity / 200 // 0-50% bonus
  } else if (employment.taskType === 'protect' || employment.taskType === 'guard') {
    progress += employee.traits.discipline / 200
  } else if (employment.taskType === 'negotiate') {
    progress += employee.traits.empathy / 200
  } else if (employment.taskType === 'sabotage') {
    progress += employee.traits.ruthlessness / 200
  }

  // Random variance (-10% to +10%)
  const variance = (state.rngSeed % 20) - 10
  progress += variance

  return Math.max(0, Math.min(100, progress))
}

function getSkillValueForTask(
  employee: { skills: Record<string, number>; traits: Record<string, number> },
  employment: { taskType: string },
): number {
  const skillMap: Record<string, string> = {
    scout: 'survival',
    protect: 'security',
    retrieve: 'security',
    deliver: 'survival',
    guard: 'security',
    negotiate: 'negotiation',
    sabotage: 'intrigue',
    escort: 'security',
    work: 'administration',
  }

  const requiredSkill = skillMap[employment.taskType] || 'administration'
  return employee.skills[requiredSkill] || 0
}
