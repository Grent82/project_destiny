import type { GameState } from '../../../domain/game/contracts'

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
 * Returns the updated state with potential completion/failure outcomes.
 */
export function progressEmployment(
  state: GameState,
  employmentId: string,
): GameState {
  // Find the employment
  const employmentNpc = state.roster.find(
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

  // Update employment or mark as completed/failed
  let newState = state

  if (accumulatedProgress >= 100) {
    // Task completed successfully
    employmentProgressTracker.delete(employmentId)
    newState = completeEmployment(newState, employmentNpc.npcId)
  } else if (employment.deadlineDay && state.day >= employment.deadlineDay && accumulatedProgress < 50) {
    // Task failed - missed deadline with insufficient progress
    employmentProgressTracker.delete(employmentId)
    newState = failEmployment(newState, employmentNpc.npcId)
  } else {
    // Progress updated but not complete yet
    newState = {
      ...state,
      roster: state.roster.map((npc) =>
        npc.npcId === employmentNpc.npcId
          ? { ...npc, currentEmployment: { ...employment } }
          : npc,
      ),
    }
  }

  return newState
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

/**
 * Completes an employment task and distributes rewards.
 * Local import to avoid circular dependencies.
 */
function completeEmployment(state: GameState, employeeId: string): GameState {
  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee || !employee.currentEmployment) {
    return state
  }

  const employment = employee.currentEmployment

  const updatedEmployment = {
    ...employment,
    status: 'completed' as const,
    completedAtDay: state.day,
  }

  return {
    ...state,
    roster: state.roster.map((npc) =>
      npc.npcId === employeeId
        ? { ...npc, currentEmployment: updatedEmployment }
        : npc,
    ),
  }
}

/**
 * Fails an employment task with a specific reason.
 */
function failEmployment(state: GameState, employeeId: string): GameState {
  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee || !employee.currentEmployment) {
    return state
  }

  const updatedEmployment = {
    ...employee.currentEmployment,
    status: 'failed' as const,
    completedAtDay: state.day,
  }

  return {
    ...state,
    roster: state.roster.map((npc) =>
      npc.npcId === employeeId
        ? { ...npc, currentEmployment: updatedEmployment }
        : npc,
    ),
  }
}
