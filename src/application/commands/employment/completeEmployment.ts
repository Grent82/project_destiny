import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Completes an employment task and distributes rewards.
 * Pays completion bonus and updates NPC personal funds.
 */
export function completeEmployment(
  state: GameState,
  employeeId: string,
  failureReason?: string,
): GameState {
  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee || !employee.currentEmployment) {
    return state
  }

  const employment = employee.currentEmployment

  // Mark employment as completed or failed
  const updatedEmployment = {
    ...employment,
    status: failureReason ? ('failed' as const) : ('completed' as const),
    completedAtDay: state.day,
  }

  let newState = state

  // Pay completion bonus if successful
  if (!failureReason && employment.completionBonus > 0) {
    newState = payEmploymentBonus(state, employeeId, employment.completionBonus)
  }

  // Clear current employment
  newState = {
    ...newState,
    roster: newState.roster.map((npc) =>
      npc.npcId === employeeId
        ? { ...npc, currentEmployment: updatedEmployment }
        : npc,
    ),
  }

  // Log activity
  if (failureReason) {
    newState = appendActivityLogEntry(
      newState,
      'system',
      `Employment failed: ${employee.name} failed ${employment.taskType} task (${failureReason})`,
    )
  } else {
    newState = appendActivityLogEntry(
      newState,
      'system',
      `Employment completed: ${employee.name} completed ${employment.taskType} task`,
    )
  }

  return newState
}

/**
 * Pays a bonus to an NPC's personal funds.
 */
function payEmploymentBonus(
  state: GameState,
  employeeId: string,
  bonus: number,
): GameState {
  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee) {
    return state
  }

  return {
    ...state,
    roster: state.roster.map((npc) =>
      npc.npcId === employeeId
        ? {
            ...npc,
            personalFunds: {
              ...npc.personalFunds,
              savings: npc.personalFunds.savings + bonus,
            },
          }
        : npc,
    ),
  }
}

/**
 * Fails an employment task with a specific reason.
 */
export function failEmployment(
  state: GameState,
  employeeId: string,
  reason: string,
): GameState {
  return completeEmployment(state, employeeId, reason)
}

/**
 * Cancels an employment task without completion or failure.
 */
export function cancelEmployment(state: GameState, employeeId: string): GameState {
  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee || !employee.currentEmployment) {
    return state
  }

  const updatedEmployment = {
    ...employee.currentEmployment,
    status: 'cancelled' as const,
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
