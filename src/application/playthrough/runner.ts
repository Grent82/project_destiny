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

// ─── Report formatting ────────────────────────────────────────────────────────

/**
 * Metric snapshot extracted from a GameState for branch comparison.
 */
export interface ScenarioMetrics {
  day: number
  money: number
  rosterCount: number
  rosterReadyCount: number
  activeQuestCount: number
  completedQuestCount: number
  factionStandings: Record<string, number>
  unrest: number
  lastEncounterOutcome: string | null
}

function extractMetrics(state: GameState): ScenarioMetrics {
  return {
    day: state.day,
    money: state.money,
    rosterCount: state.roster.length,
    rosterReadyCount: state.roster.filter((n) => n.assignment === 'idle' && n.states.health > 30).length,
    activeQuestCount: state.activeQuests.length,
    completedQuestCount: state.completedQuestIds.length,
    factionStandings: { ...state.factionStandings },
    unrest: state.cityDials.unrest,
    lastEncounterOutcome: state.lastEncounterSummary?.outcome ?? null,
  }
}

/**
 * Format a RunResult as a human-readable summary string.
 * Stable output for snapshot and CI use.
 */
export function formatPlaythroughReport(result: RunResult): string {
  const lines: string[] = []
  const status = result.passed ? '✓ PASSED' : `✗ FAILED (${result.failures.length} failure${result.failures.length !== 1 ? 's' : ''})`
  lines.push(`Scenario: ${result.scenarioId}`)
  lines.push(`Status:   ${status}`)
  lines.push(`Steps:    ${result.trace.length} (${result.trace.filter((t) => t.status === 'ok').length} ok)`)
  lines.push('')

  if (result.failures.length > 0) {
    lines.push('Failures:')
    for (const f of result.failures) {
      lines.push(`  [${f.stepLabel}] ${f.assertionId}: ${f.description}`)
    }
    lines.push('')
  }

  const metrics = extractMetrics(result.finalState)
  lines.push('Final state metrics:')
  lines.push(`  Day:             ${metrics.day}`)
  lines.push(`  Money:           ${metrics.money} Mk`)
  lines.push(`  Roster:          ${metrics.rosterCount} (${metrics.rosterReadyCount} ready)`)
  lines.push(`  Active quests:   ${metrics.activeQuestCount}`)
  lines.push(`  Completed:       ${metrics.completedQuestCount}`)
  lines.push(`  Unrest:          ${metrics.unrest}`)
  if (metrics.lastEncounterOutcome) {
    lines.push(`  Last encounter:  ${metrics.lastEncounterOutcome}`)
  }

  const factionKeys = Object.keys(metrics.factionStandings).sort()
  if (factionKeys.length > 0) {
    lines.push('  Faction standings:')
    for (const key of factionKeys) {
      lines.push(`    ${key}: ${metrics.factionStandings[key]}`)
    }
  }

  if (result.branches && Object.keys(result.branches).length > 0) {
    lines.push('')
    lines.push('Branches:')
    for (const [branchId, branchResult] of Object.entries(result.branches)) {
      const bStatus = branchResult.passed ? '✓' : '✗'
      lines.push(`  ${bStatus} ${branchId}: ${branchResult.failures.length} failure(s)`)
    }
  }

  return lines.join('\n')
}

/**
 * Compare two RunResults by their final-state metrics.
 * Returns a human-readable diff of game-meaningful changes.
 */
export function diffBranchResults(baseLabel: string, base: RunResult, compareLabel: string, compare: RunResult): string {
  const bm = extractMetrics(base.finalState)
  const cm = extractMetrics(compare.finalState)

  const lines: string[] = []
  lines.push(`Branch diff: ${baseLabel} → ${compareLabel}`)
  lines.push('')

  function delta(label: string, b: number, c: number) {
    if (b === c) return
    const sign = c > b ? '+' : ''
    lines.push(`  ${label}: ${b} → ${c} (${sign}${c - b})`)
  }

  delta('Day', bm.day, cm.day)
  delta('Money', bm.money, cm.money)
  delta('Roster count', bm.rosterCount, cm.rosterCount)
  delta('Roster ready', bm.rosterReadyCount, cm.rosterReadyCount)
  delta('Active quests', bm.activeQuestCount, cm.activeQuestCount)
  delta('Completed quests', bm.completedQuestCount, cm.completedQuestCount)
  delta('Unrest', bm.unrest, cm.unrest)

  const allFactions = new Set([...Object.keys(bm.factionStandings), ...Object.keys(cm.factionStandings)])
  for (const f of Array.from(allFactions).sort()) {
    delta(`Faction ${f}`, bm.factionStandings[f] ?? 0, cm.factionStandings[f] ?? 0)
  }

  if (bm.lastEncounterOutcome !== cm.lastEncounterOutcome) {
    lines.push(`  Last encounter: ${bm.lastEncounterOutcome ?? 'none'} → ${cm.lastEncounterOutcome ?? 'none'}`)
  }

  if (lines.length === 2) {
    lines.push('  (no meaningful metric deltas)')
  }

  return lines.join('\n')
}
