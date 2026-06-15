import { type GameState } from '../../domain/game/contracts'

/**
 * Corridor throughput multipliers based on status.
 * narrative.md section 11: ~50% of city food comes via the Green Corridor.
 */
export const CORRIDOR_THROUGHPUT_MODIFIERS: Record<GameState['cityResources']['corridorStatus'], number> = {
  open: 1.0,
  disrupted: 0.3,
  blocked: 0.0,
}

/**
 * Base daily food import through the Green Corridor when fully open.
 * This represents the ~50% of city supply that comes via the corridor.
 */
export const BASE_CORRIDOR_IMPORT = 500

/**
 * Toll rate: percentage of import value collected by the managing coalition.
 */
export const CORRIDOR_TOLL_RATE = 0.05 // 5% toll

/**
 * applyCorridorImport: calculates daily food import through the Green Corridor.
 *
 * Import formula:
 *   import = BASE_CORRIDOR_IMPORT * throughputModifier
 *
 * Throughput modifiers:
 *   - open: 1.0 (full import = BASE_CORRIDOR_IMPORT)
 *   - disrupted: 0.3 (reduced import = ~30% of base)
 *   - blocked: 0.0 (no import)
 *
 * Toll income:
 *   toll = import * TOLL_RATE (routed to coalition/player)
 *
 * @param state - Current game state
 * @returns New game state with updated food stock and optional toll income
 */
export function applyCorridorImport(state: GameState): { state: GameState; tollIncome: number } {
  const modifier = CORRIDOR_THROUGHPUT_MODIFIERS[state.cityResources.corridorStatus]
  const importAmount = Math.round(BASE_CORRIDOR_IMPORT * modifier)

  const newFoodStock = state.cityResources.foodStock + importAmount

  // Calculate toll income (only when corridor is open or disrupted)
  const tollIncome = Math.round(importAmount * CORRIDOR_TOLL_RATE)

  return {
    state: {
      ...state,
      cityResources: {
        ...state.cityResources,
        foodStock: newFoodStock,
      },
    },
    tollIncome,
  }
}

/**
 * Reopening progress thresholds for the Green Corridor.
 */
export const CORRIDOR_REOPENING_THRESHOLDS = {
  blockedToDisrupted: 3, // Days of effort to move from blocked to disrupted
  disruptedToOpen: 2,    // Days of effort to move from disrupted to open
}

/**
 * reopenCorridor: attempts to improve corridor status through clearance efforts.
 *
 * Progress rules:
 *   - blocked -> disrupted: requires 3 consecutive days of effort
 *   - disrupted -> open: requires 2 consecutive days of effort
 *   - Progress is tracked in lastFiredDay under 'corridorClearance' key
 *
 * @param state - Current game state
 * @param effortDays - Number of days of clearance effort to apply
 * @returns New game state with potentially improved corridor status
 */
export function reopenCorridor(state: GameState, effortDays: number = 1): GameState {
  let next = { ...state }
  const currentStatus = next.cityResources.corridorStatus

  // No improvement needed if already open
  if (currentStatus === 'open') {
    return next
  }

  // Track clearance progress
  const clearanceKey = 'corridorClearance'
  const currentProgress = next.lastFiredDay[clearanceKey] ?? 0
  const newProgress = currentProgress + effortDays

  // Check if we can advance status
  if (currentStatus === 'blocked' && newProgress >= CORRIDOR_REOPENING_THRESHOLDS.blockedToDisrupted) {
    // Advance to disrupted
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        corridorStatus: 'disrupted',
      },
      lastFiredDay: {
        ...next.lastFiredDay,
        [clearanceKey]: 0, // Reset progress for next stage
      },
    }
  } else if (currentStatus === 'disrupted' && newProgress >= CORRIDOR_REOPENING_THRESHOLDS.disruptedToOpen) {
    // Advance to open
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        corridorStatus: 'open',
      },
      lastFiredDay: {
        ...next.lastFiredDay,
        [clearanceKey]: 0,
      },
    }
  } else {
    // Just accumulate progress
    next = {
      ...next,
      lastFiredDay: {
        ...next.lastFiredDay,
        [clearanceKey]: newProgress,
      },
    }
  }

  // Advance RNG seed based on effort
  next.rngSeed = state.rngSeed + effortDays

  return next
}

/**
 * getCorridorReopeningProgress: returns current clearance progress.
 */
export function getCorridorReopeningProgress(state: GameState): {
  currentStatus: GameState['cityResources']['corridorStatus']
  daysProgress: number
  daysRemaining: number
} {
  const currentStatus = state.cityResources.corridorStatus
  const daysProgress = state.lastFiredDay['corridorClearance'] ?? 0

  let daysRemaining = 0
  if (currentStatus === 'blocked') {
    daysRemaining = Math.max(0, CORRIDOR_REOPENING_THRESHOLDS.blockedToDisrupted - daysProgress)
  } else if (currentStatus === 'disrupted') {
    daysRemaining = Math.max(0, CORRIDOR_REOPENING_THRESHOLDS.disruptedToOpen - daysProgress)
  }

  return {
    currentStatus,
    daysProgress,
    daysRemaining,
  }
}
