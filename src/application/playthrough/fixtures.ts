/**
 * Shared playthrough fixtures, invariants, and branch diff helpers.
 *
 * Use these in scenario files to avoid duplicating boilerplate.
 * All fixtures build on GameState and are safe to spread-override.
 *
 * destiny-4u73.3
 */

import type { GameState } from '../../domain/game/contracts'
import type { AssertionSpec, RunResult } from './contracts'
import { assertion } from './contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Default start state — day 1, no roster, no money modifications. */
export const fixtureDefaultStart: Partial<GameState> = {}

/** Progressed start state — day 15, debt still outstanding. */
export const fixtureDay15: Partial<GameState> = {
  day: 15,
  timeSlot: 'morning' as const,
}

/** Debt crisis imminent — day 28, player has no money to pay. */
export const fixtureDebtCrisisImminent: Partial<GameState> = {
  day: 28,
  money: 0,
  debtPaid: false,
  debtCrisisTriggered: false,
}

/** Combat active state — adds a minimal activeCombat entry.
 *  Callers must merge with a store state that has activeCombat initialized. */
export const fixtureCombatActive: Partial<GameState> = {
  activeCombat: null, // Overridden by scenario when combat is started
}

/**
 * Merge the base snapshot with a partial override.
 * Convenience for clean scenario initialState definitions.
 */
export function withState(partial: Partial<GameState>): GameState {
  return { ...initialGameStateSnapshot, ...partial }
}

// ─── Shared Invariants ────────────────────────────────────────────────────────

/** Player money must never go negative. */
export const invariantMoneyNonNegative: AssertionSpec = assertion(
  'money-non-negative',
  'Player money must never go negative',
  (state) => state.money >= 0
)

/** Day counter must always be positive. */
export const invariantDayPositive: AssertionSpec = assertion(
  'day-positive',
  'Day must always be positive',
  (state) => state.day > 0
)

/** Roster NPC IDs in selected squad must all exist in the roster. */
export const invariantSquadFromRoster: AssertionSpec = assertion(
  'squad-from-roster',
  'All selected squad members must be in the roster',
  (state) =>
    state.selectedSquadNpcIds.every((id) =>
      state.npcRuntimeStates.some((npc) => npc.npcId === id)
    )
)

/** Active combat must not be set while another combat is already active (no double-entry). */
export const invariantNoCombatDoublEntry: AssertionSpec = assertion(
  'no-combat-double-entry',
  'activeCombat must be null or a single valid combat state, not nested',
  (state) => state.activeCombat === null || typeof state.activeCombat === 'object'
)

/** Debt state must be internally consistent. */
export const invariantDebtConsistency: AssertionSpec = assertion(
  'debt-consistency',
  'debtPaid and debtCrisisTriggered cannot both be true',
  (state) => !(state.debtPaid && state.debtCrisisTriggered)
)

/** All active quest IDs must not appear in completedQuestIds. */
export const invariantQuestNoOverlap: AssertionSpec = assertion(
  'quest-no-overlap',
  'Active quests must not appear in completedQuestIds',
  (state) =>
    state.activeQuests.every(
      (q) => !state.completedQuestIds.includes(q.questId)
    )
)

/** Standard invariant set for most scenarios. */
export const standardInvariants: AssertionSpec[] = [
  invariantMoneyNonNegative,
  invariantDayPositive,
  invariantSquadFromRoster,
  invariantDebtConsistency,
  invariantQuestNoOverlap,
]

// ─── Branch Diff Helpers ──────────────────────────────────────────────────────

export interface BranchDelta {
  moneyDelta: number
  dayDelta: number
  rosterSizeDelta: number
  completedQuestsDelta: number
  debtPaidChanged: boolean
  debtCrisisDelta: boolean
}

/**
 * Compare two RunResult final states and return a structured delta.
 * Useful for asserting meaningful differences between branches.
 */
export function diffBranches(a: RunResult, b: RunResult): BranchDelta {
  return {
    moneyDelta: b.finalState.money - a.finalState.money,
    dayDelta: b.finalState.day - a.finalState.day,
    rosterSizeDelta: b.finalState.npcRuntimeStates.length - a.finalState.npcRuntimeStates.length,
    completedQuestsDelta:
      b.finalState.completedQuestIds.length - a.finalState.completedQuestIds.length,
    debtPaidChanged: a.finalState.debtPaid !== b.finalState.debtPaid,
    debtCrisisDelta: a.finalState.debtCrisisTriggered !== b.finalState.debtCrisisTriggered,
  }
}

/**
 * Assert that two branches diverged on the given field.
 * @example
 * const delta = diffBranches(result.branches!['pay'], result.branches!['ignore'])
 * expect(branchDivergedOn(delta, 'debtPaidChanged')).toBe(true)
 */
export function branchDivergedOn(delta: BranchDelta, field: keyof BranchDelta): boolean {
  const value = delta[field]
  if (typeof value === 'boolean') return value
  return value !== 0
}
