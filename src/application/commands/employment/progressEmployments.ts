import type { GameState } from '../../../domain/game/contracts'
import { progressEmployment } from './progressEmployment'
import { failEmployment } from './completeEmployment'

/**
 * Processes all active employments for the day.
 * - Starts pending employments
 * - Progresses in-progress employments
 * - Completes or fails employments based on progress and deadlines
 */
export function processAllEmployments(state: GameState): GameState {
  let newState = state

  // Find all NPCs with employment
  const employments = state.roster
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
    const updatedNpc = newState.roster.find((npc) => npc.npcId === employeeId)
    if (updatedNpc?.currentEmployment?.status === 'in-progress') {
      // Check for deadline failure
      if (
        employment.deadlineDay &&
        newState.day >= employment.deadlineDay
      ) {
        newState = failEmployment(newState, employeeId)
      }
    }
  }

  return newState
}

/**
 * Starts a pending employment.
 */
function startEmployment(state: GameState, employeeId: string): GameState {
  const npc = state.roster.find((npc) => npc.npcId === employeeId)
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
    roster: state.roster.map((rosterNpc) =>
      rosterNpc.npcId === employeeId
        ? { ...rosterNpc, currentEmployment: updatedEmployment }
        : rosterNpc,
    ),
  }
}
