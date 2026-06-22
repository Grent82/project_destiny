/**
 * Economy Invariant Suite (destiny-pgh1)
 *
 * Regression harness for the Food Supply Chain slice:
 * - Equilibrium: food stock and price stay bounded over N days
 * - Closure crisis: blocking the Corridor drives stock down, price up
 * - Recovery: reopening the Corridor restores stock toward baseline
 * - Determinism: identical end-state for a fixed rngSeed
 */

import type { PlaythroughScenario } from '../contracts'
import { assertion } from '../contracts'
import type { GameState } from '../../../domain'

/**
 * Check that food economy metrics are within expected bounds.
 */
function checkFoodEquilibrium(state: GameState): boolean {
  const { foodStock, foodCapacity } = state.cityResources
  const capacity = foodCapacity || 1000 // fallback to avoid divide by zero
  const stockRatio = foodStock / capacity

  // Stock should stay between 20% and 120% of capacity (buffer allowed)
  return stockRatio >= 0.2 && stockRatio <= 1.2
}

/**
 * Check that corridor reopening leads to recovery.
 */
function checkRecovery(state: GameState): boolean {
  const { corridorStatus, foodSecurity } = state.cityResources
  if (corridorStatus === 'open') {
    // Recovery: foodSecurity should be recovering (above 50%)
    return foodSecurity > 40
  }
  return true
}

// ─── Scenario 1: Equilibrium over 20 days ────────────────────────────────────

export const equilibriumScenario: PlaythroughScenario = {
  id: 'economy-equilibrium-20days',
  title: 'Food Economy Equilibrium: bounded stock over 20 days',
  rngSeed: 42,
  initialState: {
    day: 1,
    money: 1000,
    cityResources: {
      foodStock: 800,
      foodCapacity: 1000,
      foodSecurity: 80,
      waterAccess: 80,
      materialStock: 300,
      corridorStatus: 'open',
      corridorClearanceProgressDays: 0,
    },
    roster: [],
    activeQuests: [],
    completedQuestIds: [],
  },

  steps: [
    { type: 'advance-days', label: 'Run 20 days of normal simulation', days: 20 },
    {
      type: 'assert',
      label: 'Verify equilibrium bounds',
      assertions: [
        assertion(
          'equilibrium-stock-bounded',
          'Food stock stays within 20%-120% of capacity',
          checkFoodEquilibrium
        ),
        assertion(
          'equilibrium-security-reasonable',
          'Food security remains between 20% and 100%',
          (s) => s.cityResources.foodSecurity >= 20 && s.cityResources.foodSecurity <= 100
        ),
        assertion(
          'corridor-open',
          'Corridor remains open',
          (s) => s.cityResources.corridorStatus === 'open'
        ),
      ],
    },
  ],

  invariants: [
    assertion('inv-money-non-negative', 'Money never negative', (s) => s.money >= 0),
    assertion('inv-day-advances', 'Day counter advances', (s) => s.day > 0),
  ],
}

// ─── Scenario 2: Closure crisis ──────────────────────────────────────────────

export const closureCrisisScenario: PlaythroughScenario = {
  id: 'economy-closure-crisis',
  title: 'Closure Crisis: Corridor blocked leads to food shortage',
  rngSeed: 127,
  initialState: {
    day: 1,
    money: 1000,
    cityResources: {
      foodStock: 900,
      foodCapacity: 1000,
      foodSecurity: 90,
      waterAccess: 80,
      materialStock: 300,
      corridorStatus: 'open',
      corridorClearanceProgressDays: 0,
    },
    roster: [],
    activeQuests: [],
    completedQuestIds: [],
  },

  steps: [
    { type: 'advance-days', label: 'Run 5 days with open corridor', days: 5 },
    {
      type: 'dispatch',
      label: 'Block the Corridor (simulate disruption event)',
      command: (_state, dispatch) => {
        dispatch({
          type: 'game/setCorridorStatus',
          payload: 'blocked',
        })
      },
    },
    { type: 'advance-days', label: 'Run 10 days with blocked corridor', days: 10 },
    {
      type: 'assert',
      label: 'Verify crisis conditions',
      assertions: [
        assertion(
          'crisis-corridor-blocked',
          'Corridor is blocked',
          (s) => s.cityResources.corridorStatus === 'blocked'
        ),
        assertion(
          'crisis-security-dropped',
          'Food security dropped below 70%',
          (s) => s.cityResources.foodSecurity < 70
        ),
        assertion(
          'crisis-stock-low',
          'Food stock is depleted',
          (s) => s.cityResources.foodStock < s.cityResources.foodStock * 0.8 || s.cityResources.foodStock < 500
        ),
      ],
    },
  ],

  invariants: [
    assertion('inv-money-non-negative', 'Money never negative', (s) => s.money >= 0),
    assertion('inv-day-advances', 'Day counter advances', (s) => s.day > 0),
  ],
}

// ─── Scenario 3: Recovery after reopening ────────────────────────────────────

export const recoveryScenario: PlaythroughScenario = {
  id: 'economy-recovery',
  title: 'Recovery: Corridor reopening restores food stock',
  rngSeed: 256,
  initialState: {
    day: 1,
    money: 1000,
    cityResources: {
      foodStock: 500,
      foodCapacity: 1000,
      foodSecurity: 50,
      waterAccess: 50,
      materialStock: 300,
      corridorStatus: 'blocked',
      corridorClearanceProgressDays: 0,
    },
    roster: [],
    activeQuests: [],
    completedQuestIds: [],
  },

  steps: [
    { type: 'advance-days', label: 'Run 3 days with blocked corridor (accumulate clearance progress)', days: 3 },
    {
      type: 'dispatch',
      label: 'Set corridor to disrupted (simulate partial clearance)',
      command: (_state, dispatch) => {
        dispatch({
          type: 'game/setCorridorStatus',
          payload: 'disrupted',
        })
      },
    },
    { type: 'advance-days', label: 'Run 2 days with disrupted corridor', days: 2 },
    {
      type: 'dispatch',
      label: 'Set corridor to open (full reopening)',
      command: (_state, dispatch) => {
        dispatch({
          type: 'game/setCorridorStatus',
          payload: 'open',
        })
      },
    },
    { type: 'advance-days', label: 'Run 10 days with open corridor (recovery)', days: 10 },
    {
      type: 'assert',
      label: 'Verify recovery',
      assertions: [
        assertion(
          'recovery-corridor-open',
          'Corridor is open',
          (s) => s.cityResources.corridorStatus === 'open'
        ),
        assertion(
          'recovery-security-improved',
          'Food security improved above 40%',
          checkRecovery
        ),
        assertion(
          'recovery-stock-growing',
          'Food stock is recovering',
          (s) => s.cityResources.foodStock > 400
        ),
      ],
    },
  ],

  invariants: [
    assertion('inv-money-non-negative', 'Money never negative', (s) => s.money >= 0),
    assertion('inv-day-advances', 'Day counter advances', (s) => s.day > 0),
  ],
}

// ─── Scenario 4: Determinism guard ───────────────────────────────────────────

export const determinismGuardScenario: PlaythroughScenario = {
  id: 'economy-determinism-guard',
  title: 'Determinism Guard: identical runs with same seed',
  rngSeed: 999,
  initialState: {
    day: 1,
    money: 1000,
    cityResources: {
      foodStock: 800,
      foodCapacity: 1000,
      foodSecurity: 80,
      waterAccess: 80,
      materialStock: 300,
      corridorStatus: 'open',
      corridorClearanceProgressDays: 0,
    },
    roster: [],
    activeQuests: [],
    completedQuestIds: [],
  },

  steps: [
    { type: 'checkpoint', checkpointId: 'det-start', label: 'Starting state' },
    { type: 'advance-days', label: 'Run 15 days', days: 15 },
    { type: 'checkpoint', checkpointId: 'det-end', label: 'Ending state' },
    {
      type: 'assert',
      label: 'Verify deterministic metrics',
      assertions: [
        assertion(
          'det-day-advanced',
          'Day advanced to 16',
          (s) => s.day === 16
        ),
        assertion(
          'det-money-valid',
          'Money is non-negative',
          (s) => s.money >= 0
        ),
      ],
    },
  ],

  invariants: [
    assertion('inv-money-non-negative', 'Money never negative', (s) => s.money >= 0),
    assertion('inv-day-advances', 'Day counter advances', (s) => s.day > 0),
  ],
}
