import type { GameState } from '../../../domain/game/contracts'
import { progressEmployment } from './progressEmployment'
import { failEmployment } from './completeEmployment'

/**
 * Processes all active employments for the day.
 * - Starts pending employments
 * - Progresses in-progress employments
 * - Completes or fails employments based on progress and deadlines
 * - Handles auto-renewal for completed employments
 */
export function processAllEmployments(state: GameState): GameState {
  let newState = state

  // Find all NPCs with employment
  const employments = state.npcRuntimeStates
    .filter((npc) => npc.currentEmployment !== null)
    .map((npc) => ({
      npc,
      employment: npc.currentEmployment!,
    }))

  for (const { npc, employment } of employments) {
    newState = processSingleEmployment(newState, npc.npcId, employment)
  }

  return newState
}

/**
 * Processes a single employment based on its current state.
 */
function processSingleEmployment(
  state: GameState,
  employeeId: string,
  employment: {
    employmentId: string
    status: string
    deadlineDay?: number
    createdAtDay: number
    autoRenew?: boolean
    performanceThreshold?: number
  },
): GameState {
  let newState = state

  if (employment.status === 'pending') {
    // Check if deadline already passed before starting
    if (employment.deadlineDay && state.day >= employment.deadlineDay) {
      // Deadline already passed, fail immediately
      newState = failEmployment(state, employeeId, 'deadline_missed')
    } else {
      // Start the employment
      newState = startEmployment(state, employeeId)
    }
  } else if (employment.status === 'in-progress') {
    // Progress the employment
    newState = progressEmployment(newState, employment.employmentId)

    // Check if employment should be completed or failed after progress
    const updatedNpc = newState.npcRuntimeStates.find((npc) => npc.npcId === employeeId)
    if (updatedNpc?.currentEmployment?.status === 'in-progress') {
      // Check for deadline failure
      if (
        employment.deadlineDay &&
        newState.day >= employment.deadlineDay
      ) {
        newState = failEmployment(newState, employeeId, 'deadline_missed')
      }
    } else if (updatedNpc?.currentEmployment?.status === 'completed') {
      // Check for auto-renewal
      if (employment.autoRenew) {
        newState = handleAutoRenewal(newState, employeeId)
      }
    }
  }

  return newState
}

/**
 * Handles auto-renewal of a completed employment.
 * Creates a new employment contract with updated parameters.
 */
function handleAutoRenewal(
  state: GameState,
  employeeId: string,
): GameState {
  const npc = state.npcRuntimeStates.find((npc) => npc.npcId === employeeId)
  if (!npc || !npc.currentEmployment) {
    return state
  }

  // Create new employment with same parameters but new ID
  const newEmploymentId = `employment-${npc.currentEmployment.employerId}-${employeeId}-${state.day}-renew`

  const renewedEmployment = {
    ...npc.currentEmployment,
    employmentId: newEmploymentId,
    status: 'pending' as const,
    createdAtDay: state.day,
    startedAtDay: null,
    completedAtDay: null,
    performanceHistory: [], // Reset history for new contract
  }

  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((rosterNpc) =>
      rosterNpc.npcId === employeeId
        ? { ...rosterNpc, currentEmployment: renewedEmployment }
        : rosterNpc,
    ),
  }
}

/**
 * Starts a pending employment.
 */
function startEmployment(state: GameState, employeeId: string): GameState {
  const npc = state.npcRuntimeStates.find((npc) => npc.npcId === employeeId)
  if (!npc || !npc.currentEmployment) {
    return state
  }

  if (npc.currentEmployment.status !== 'pending') {
    return state
  }

  const updatedEmployment = {
    ...npc.currentEmployment,
    status: 'in-progress' as const,
    startedAtDay: state.day,
  }

  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((rosterNpc) =>
      rosterNpc.npcId === employeeId
        ? { ...rosterNpc, currentEmployment: updatedEmployment }
        : rosterNpc,
    ),
  }
}
