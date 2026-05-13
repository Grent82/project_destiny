/**
 * Playthrough Harness Contract
 *
 * A playthrough scenario is a data-first, command-level script that can be
 * executed deterministically using a seeded RNG. Scenarios express player
 * intentions as typed steps; they do not reference UI elements.
 *
 * Architecture
 * ─────────────
 * Scenario  →  Runner (destiny-4u73.2)  →  RunResult
 *                    ↓
 *              Uses GameState + gameActions (Redux Toolkit)
 *              Injects rng via seededRng(seed)
 *
 * Key design decisions
 * ─────────────────────
 * 1. Data-first: scenarios are plain objects, not class instances.
 * 2. Seed injection: every scenario declares an explicit rngSeed so runs are
 *    reproducible; the runner resets the seed before each step.
 * 3. Branch coverage: a scenario may contain BranchStep arrays; the runner
 *    executes each branch independently and returns all their RunResults.
 * 4. Assertions are inline: steps may carry assertion objects that the runner
 *    checks before advancing; failures are accumulated rather than throwing.
 * 5. Checkpoints snapshot partial state for snapshot testing.
 */

import { z } from 'zod'
import type { GameState } from '../../domain/game/contracts'
import type { AppDispatch } from '../store/gameStore'

// ─── Step Types ──────────────────────────────────────────────────────────────

/**
 * Dispatch a thunk or plain action creator call.
 * `command` is a function that receives the current state and dispatch,
 * and must mutate state by dispatching actions.
 */
export interface DispatchStep {
  type: 'dispatch'
  label: string
  command: (state: GameState, dispatch: AppDispatch) => void
}

/**
 * Advance the game by N days, triggering endDay for each.
 * Useful for time-skip scenarios (e.g. "wait until debt is due").
 */
export interface AdvanceDaysStep {
  type: 'advance-days'
  label: string
  days: number
}

/**
 * Assert one or more predicates against the current GameState.
 * All failing assertions are collected into the RunResult.
 */
export interface AssertStep {
  type: 'assert'
  label: string
  assertions: AssertionSpec[]
}

/**
 * Snapshot the current GameState at this point.
 * The snapshot is stored in RunResult.checkpoints keyed by `checkpointId`.
 */
export interface CheckpointStep {
  type: 'checkpoint'
  checkpointId: string
  label: string
}

/**
 * Branch into multiple parallel scenario tracks.
 * The runner executes each branch from the current state independently.
 * Branch RunResults are stored in RunResult.branches.
 */
export interface BranchStep {
  type: 'branch'
  label: string
  branches: Array<{
    branchId: string
    label: string
    steps: ScenarioStep[]
  }>
}

export type ScenarioStep =
  | DispatchStep
  | AdvanceDaysStep
  | AssertStep
  | CheckpointStep
  | BranchStep

// ─── Assertion Spec ───────────────────────────────────────────────────────────

/**
 * A single named assertion against the current GameState.
 * `predicate` returns true if the assertion passes.
 * `description` is shown in RunResult.failures when it fails.
 */
export interface AssertionSpec {
  id: string
  description: string
  predicate: (state: GameState) => boolean
}

// ─── Scenario Definition ──────────────────────────────────────────────────────

/**
 * A complete scenario definition.
 *
 * @property id         - Unique stable identifier for snapshot caching.
 * @property title      - Human-readable name shown in test output.
 * @property rngSeed    - Deterministic seed; runner resets RNG before each step.
 * @property initialState - Optional partial override over the default game state.
 *                          If omitted, runner starts from initialGameStateSnapshot.
 * @property steps      - Ordered list of steps to execute.
 * @property invariants - Predicates checked after every step. Violations are
 *                        accumulated as invariant failures in RunResult.
 */
export interface PlaythroughScenario {
  id: string
  title: string
  rngSeed: number
  initialState?: Partial<GameState>
  steps: ScenarioStep[]
  invariants?: AssertionSpec[]
}

// ─── Run Result ───────────────────────────────────────────────────────────────

/**
 * The result of executing a PlaythroughScenario.
 */
export interface RunResult {
  scenarioId: string
  /** The state after all steps completed (or the state when execution stopped). */
  finalState: GameState
  /** Snapshot states captured by CheckpointStep. */
  checkpoints: Record<string, GameState>
  /** Ordered trace of step labels and whether they passed. */
  trace: Array<{ label: string; status: 'ok' | 'failed' | 'skipped' }>
  /** All assertion and invariant failures. Empty means the run passed. */
  failures: Array<{ stepLabel: string; assertionId: string; description: string }>
  /** Whether the run passed (no failures). */
  passed: boolean
  /** Branch results if a BranchStep was executed, keyed by branchId. */
  branches?: Record<string, RunResult>
}

// ─── Zod validation for serialisable subsets ─────────────────────────────────

/** Serialisable failure record for storing/comparing run results. */
export const runFailureSchema = z.object({
  stepLabel: z.string(),
  assertionId: z.string(),
  description: z.string(),
})

export const traceEntrySchema = z.object({
  label: z.string(),
  status: z.enum(['ok', 'failed', 'skipped']),
})

export type RunFailure = z.infer<typeof runFailureSchema>
export type TraceEntry = z.infer<typeof traceEntrySchema>

// ─── Helper builders ─────────────────────────────────────────────────────────

/** Build a DispatchStep. */
export function dispatchStep(label: string, command: DispatchStep['command']): DispatchStep {
  return { type: 'dispatch', label, command }
}

/** Build an AssertStep. */
export function assertStep(label: string, assertions: AssertionSpec[]): AssertStep {
  return { type: 'assert', label, assertions }
}

/** Build a CheckpointStep. */
export function checkpointStep(checkpointId: string, label: string): CheckpointStep {
  return { type: 'checkpoint', checkpointId, label }
}

/** Build an AdvanceDaysStep. */
export function advanceDaysStep(label: string, days: number): AdvanceDaysStep {
  return { type: 'advance-days', label, days }
}

/** Build an assertion spec inline. */
export function assertion(
  id: string,
  description: string,
  predicate: (state: GameState) => boolean
): AssertionSpec {
  return { id, description, predicate }
}
