import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Termination reasons for employment contracts.
 */
export type TerminationReason =
  | 'employer_initiated'        // Employer chose to terminate
  | 'employee_resignation'      // Employee quit
  | 'poaching'                  // Poached by another employer
  | 'performance_failure'       // Failed to meet performance threshold
  | 'mutual_agreement'          // Both parties agreed to end
  | 'breach_of_contract'        // Violation of terms

/**
 * Parameters for terminating an employment contract.
 */
export interface TerminateEmploymentParams {
  employeeId: string
  terminationReason: TerminationReason
  terminatingBy: 'employer' | 'employee' | 'mutual'
  penaltyPaid?: boolean  // Whether termination penalty was paid
}

/**
 * Terminates an active employment contract.
 *
 * Termination rules:
 * - Employer can terminate anytime (may pay penalty)
 * - Employee can resign (reduces trust with employer)
 * - Poaching requires successful negotiation check
 * - Performance failure auto-terminates if threshold not met
 */
export function terminateEmployment(
  state: GameState,
  params: TerminateEmploymentParams,
): GameState {
  const { employeeId, terminationReason, penaltyPaid = false } = params

  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee || !employee.currentEmployment) {
    return state
  }

  const employment = employee.currentEmployment

  // Check priority rules: Faction Directive > Employment
  // If a faction directive exists, employment should already be cleared
  // but we handle it gracefully here

  const updatedEmployment = {
    ...employment,
    status: 'cancelled' as const,
    completedAtDay: state.day,
  }

  let newState = {
    ...state,
    roster: state.roster.map((npc) =>
      npc.npcId === employeeId
        ? { ...npc, currentEmployment: updatedEmployment }
        : npc,
    ),
  }

  // Build activity log message
  let activityMessage: string
  switch (terminationReason) {
    case 'employer_initiated':
      activityMessage = `${employee.name} was released from ${employment.taskType} employment`
      break
    case 'employee_resignation':
      activityMessage = `${employee.name} resigned from ${employment.taskType} employment`
      break
    case 'poaching':
      activityMessage = `${employee.name} was poached from ${employment.taskType} employment`
      break
    case 'performance_failure':
      activityMessage = `${employee.name} failed to meet performance requirements for ${employment.taskType}`
      break
    case 'mutual_agreement':
      activityMessage = `${employee.name} and employer mutually agreed to end employment`
      break
    case 'breach_of_contract':
      activityMessage = `${employee.name} breached employment contract for ${employment.taskType}`
      break
    default:
      activityMessage = `Employment for ${employee.name} was terminated`
  }

  if (penaltyPaid) {
    activityMessage += ' (penalty paid)'
  }

  newState = appendActivityLogEntry(newState, 'system', activityMessage)

  return newState
}
