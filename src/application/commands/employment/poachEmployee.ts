import type { GameState } from '../../../domain/game/contracts'
import { createRng } from '../seededRng'
import { appendActivityLogEntry } from '../activityLog'
import type { CreateEmploymentParams } from './types'

/**
 * Result of a poaching attempt.
 */
export interface PoachResult {
  success: boolean
  message: string
  newState?: GameState
  newEmployment?: {
    employmentId: string
    wageOffer: number
  }
}

/**
 * Parameters for poaching an employee.
 */
export interface PoachParams {
  poacherId: string           // ID of the entity trying to poach
  poacherType: 'player' | 'npc' | 'faction'
  employeeId: string          // ID of the employee to poach
  wageOffer: number           // New wage being offered
  bonusOffer?: number         // Optional signing bonus
  poachBonus?: number         // Bonus to increase poach success (bribery, etc)
}

/**
 * Attempts to poach an employee from their current employer.
 *
 * Poaching success is determined by:
 * 1. Wage differential: Higher wage = better chances
 * 2. Poach protection: Current employment's poachProtection stat
 * 3. Relationship: Trust/Affinity with current employer (reduces success)
 * 4. Poach bonus: External factors (bribes, promises, etc.)
 *
 * Formula:
 * - Base chance = 30%
 * - Wage bonus = (newWage - oldWage) / oldWage * 40% (max +40%)
 * - Protection penalty = -poachProtection%
 * - Poach bonus = +poachBonus%
 * - Final chance clamped to 10-95%
 */
export function poachEmployee(
  state: GameState,
  params: PoachParams,
): PoachResult {
  const { poacherId, poacherType, employeeId, wageOffer, bonusOffer = 0, poachBonus = 0 } = params

  const employee = state.roster.find((npc) => npc.npcId === employeeId)
  if (!employee) {
    return {
      success: false,
      message: 'Employee not found in roster',
    }
  }

  // Check if employee has current employment
  if (!employee.currentEmployment) {
    return {
      success: false,
      message: 'Employee is not currently employed',
    }
  }

  const currentEmployment = employee.currentEmployment

  // Cannot poach from oneself
  if (currentEmployment.employerId === poacherId) {
    return {
      success: false,
      message: 'Cannot poach from yourself',
    }
  }

  // Check priority: Faction Directives cannot be poached from
  if (currentEmployment.employerType === 'faction') {
    return {
      success: false,
      message: 'Cannot poach from a faction directive',
    }
  }

  // Calculate poaching success chance
  const { rng, getSeed } = createRng(state.rngSeed)

  const oldWage = currentEmployment.wagePerDay
  const wageDifferential = wageOffer - oldWage

  // Base chance
  let successChance = 30

  // Wage bonus: (new - old) / old * 40, max +40%
  if (oldWage > 0) {
    const wageBonus = Math.min(40, (wageDifferential / oldWage) * 40)
    successChance += wageBonus
  } else if (wageOffer > 0) {
    // If old wage was 0 and new is positive, huge bonus
    successChance += 40
  }

  // Protection penalty
  successChance -= currentEmployment.poachProtection

  // Poach bonus (bribes, promises, etc.)
  successChance += poachBonus

  // Clamp to 10-95%
  successChance = Math.max(10, Math.min(95, successChance))

  // Roll for success
  const roll = rng() * 100
  const success = roll <= successChance

  if (!success) {
    return {
      success: false,
      message: `Poaching attempt failed. Employee ${employee.name} remained loyal. (Chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)})`,
    }
  }

  // Success! Create new employment
  const employmentId = `employment-${poacherId}-${employeeId}-${state.day}`
  const newEmployment = {
    employmentId,
    employerId: poacherId,
    employerType: poacherType,
    employeeId,
    taskType: currentEmployment.taskType, // Keep same task type
    target: currentEmployment.target,
    status: 'pending' as const,
    deadlineDay: currentEmployment.deadlineDay,
    wagePerDay: wageOffer,
    completionBonus: bonusOffer,
    createdAtDay: state.day,
    startedAtDay: null,
    completedAtDay: null,
    description: `Poached from previous employer`,
    autoRenew: false, // Reset auto-renew on poach
    performanceThreshold: 50, // Default threshold
    poachProtection: Math.max(0, currentEmployment.poachProtection - 20), // Reduce protection after poach
    performanceHistory: [],
  }

  const newState = {
    ...state,
    roster: state.roster.map((npc) =>
      npc.npcId === employeeId
        ? { ...npc, currentEmployment: newEmployment }
        : npc,
    ),
    rngSeed: getSeed(),
  }

  return {
    success: true,
    message: `Successfully poached ${employee.name}! (Chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)})`,
    newState,
    newEmployment: {
      employmentId,
      wageOffer,
    },
  }
}
