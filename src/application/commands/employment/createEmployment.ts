import type { GameState } from '../../../domain/game/contracts'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'
import type { CreateEmploymentParams } from './types'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Creates a new employment contract for an NPC.
 * Priority: Player Assignment > Faction Directive > NPC Employment > Personal Intention
 *
 * If the employee already has a higher-priority assignment (directive),
 * the employment is rejected.
 */
export function createEmployment(
  state: GameState,
  params: CreateEmploymentParams,
): GameState {
  // Validate employee exists in roster
  const employee = state.roster.find((npc) => npc.npcId === params.employeeId)
  if (!employee) {
    // Try world NPCs
    const worldNpc = state.worldNpcStates.find((npc) => npc.npcId === params.employeeId)
    if (!worldNpc) {
      return state
    }
  }

  // Priority check: Faction Directive > NPC Employment
  if (employee && employee.currentDirectiveId !== null) {
    // NPC has a faction directive - employment cannot override
    return state
  }

  // Create new employment
  const employmentId = `employment-${params.employerId}-${params.employeeId}-${state.day}`
  const newEmployment = npcEmploymentSchema.parse({
    employmentId,
    employerId: params.employerId,
    employerType: params.employerType,
    employeeId: params.employeeId,
    taskType: params.taskType,
    target: params.target,
    status: 'pending' as const,
    deadlineDay: params.deadlineDay,
    wagePerDay: params.wagePerDay,
    completionBonus: params.completionBonus,
    createdAtDay: state.day,
    startedAtDay: null,
    completedAtDay: null,
    description: params.description,
  })

  // Update employee state
  let newState = state
  if (employee) {
    newState = {
      ...state,
      roster: state.roster.map((npc) =>
        npc.npcId === params.employeeId
          ? { ...npc, currentEmployment: newEmployment }
          : npc,
      ),
    }
  }

  // Log activity
  newState = appendActivityLogEntry(
    newState,
    'system',
    `Employment created: ${params.employeeId} hired for ${params.taskType} task`,
  )

  return newState
}
