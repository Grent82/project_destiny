/**
 * Command-level playthrough runner (stub).
 *
 * Executes a PlaythroughScenario against a Redux game store step-by-step.
 * Uses seededRng for deterministic randomness.
 *
 * Full implementation is destiny-4u73.2. This stub provides:
 * - dispatch, assert, checkpoint, advance-days step handling
 * - branching (recursive runner per branch)
 * - invariant checking after every step
 * - structured RunResult output
 *
 * Does NOT yet handle: parallel branch concurrency, step timeout, UI events.
 */

import type {
  PlaythroughScenario,
  ScenarioStep,
  AssertionSpec,
  RunResult,
  TraceEntry,
  RunFailure,
} from './contracts'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import type { GameState } from '../../domain/game/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

function runAssertions(
  state: GameState,
  specs: AssertionSpec[],
  stepLabel: string,
  failures: RunFailure[]
): boolean {
  let allPassed = true
  for (const spec of specs) {
    if (!spec.predicate(state)) {
      failures.push({ stepLabel, assertionId: spec.id, description: spec.description })
      allPassed = false
    }
  }
  return allPassed
}

function executeSteps(
  initialState: GameState,
  steps: ScenarioStep[],
  invariants: AssertionSpec[],
  scenarioId: string
): Omit<RunResult, 'passed'> & { passed: boolean } {
  const store = createGameStore(initialState)
  const dispatch = store.dispatch
  const trace: TraceEntry[] = []
  const failures: RunFailure[] = []
  const checkpoints: Record<string, GameState> = {}
  const branches: Record<string, RunResult> = {}

  for (const step of steps) {
    const currentState = store.getState().game

    if (step.type === 'dispatch') {
      try {
        step.command(currentState, dispatch as Parameters<typeof step.command>[1])
        trace.push({ label: step.label, status: 'ok' })
      } catch (e) {
        failures.push({ stepLabel: step.label, assertionId: 'dispatch-error', description: String(e) })
        trace.push({ label: step.label, status: 'failed' })
      }
    } else if (step.type === 'advance-days') {
      for (let i = 0; i < step.days; i++) {
        dispatch(gameActions.endDay())
      }
      trace.push({ label: step.label, status: 'ok' })
    } else if (step.type === 'assert') {
      const passed = runAssertions(store.getState().game, step.assertions, step.label, failures)
      trace.push({ label: step.label, status: passed ? 'ok' : 'failed' })
    } else if (step.type === 'checkpoint') {
      checkpoints[step.checkpointId] = structuredClone(store.getState().game)
      trace.push({ label: step.label, status: 'ok' })
    } else if (step.type === 'branch') {
      trace.push({ label: step.label, status: 'ok' })
      for (const branch of step.branches) {
        const branchResult = executeSteps(
          structuredClone(store.getState().game),
          branch.steps,
          invariants,
          scenarioId
        )
        branches[branch.branchId] = { ...branchResult }
        if (!branchResult.passed) {
          failures.push({
            stepLabel: step.label,
            assertionId: `branch-${branch.branchId}-failed`,
            description: `Branch "${branch.label}" had ${branchResult.failures.length} failure(s)`,
          })
        }
      }
      // Branch steps run in sub-stores; skip invariant check on main store
      continue
    }

    // Check invariants after each non-branch step
    runAssertions(store.getState().game, invariants, `[invariant after: ${step.label}]`, failures)
  }

  return {
    scenarioId,
    finalState: store.getState().game,
    checkpoints,
    trace,
    failures,
    passed: failures.length === 0,
    branches: Object.keys(branches).length > 0 ? branches : undefined,
  }
}

/**
 * Execute a PlaythroughScenario and return a RunResult.
 * The run is deterministic given the scenario's rngSeed.
 */
export function runScenario(scenario: PlaythroughScenario): RunResult {
  // Build initial state: snapshot + scenario overrides
  const baseState: GameState = {
    ...initialGameStateSnapshot,
    rngSeed: scenario.rngSeed,
    ...(scenario.initialState ?? {}),
  }

  const result = executeSteps(
    baseState,
    scenario.steps,
    scenario.invariants ?? [],
    scenario.id
  )

  return { ...result }
}
