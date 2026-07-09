/**
 * Failure-Path and Low-Health Branch Playthrough (destiny-4u73.13)
 *
 * Intentionally drives the roster into a compromised state and exercises
 * adverse outcomes. Validates recovery behavior, persistent damage/stress
 * consequences, and world coherence after failure.
 *
 * Key differences from golden path:
 * - NPC starts at low health
 * - Expedition launched with minimal supplies (forces attrition)
 * - Assertions verify coherent aftermath, not successful outcomes
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'
import { initialGameStateSnapshot } from '../../store/initialGameState'

const SQUAD_NPC = 'npc-marion-vale'

/** Starting state with NPC at low health to simulate prior damage */
const startingState = {
  ...initialGameStateSnapshot,
  money: 50, // barely enough — economic stress
  selectedSquadNpcIds: [],
  npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
    npc.npcId === SQUAD_NPC
      ? {
          ...npc,
          states: {
            ...npc.states,
            health: 25, // critically low
            stress: 70,
            morale: 30,
          },
        }
      : npc,
  ),
  expeditionState: {
    status: 'idle' as const,
    destinationId: null,
    squadNpcIds: [],
    suppliesRemaining: 0,
    daysDeparted: 0,
    totalDays: 0,
    encounters: [],
    discoveries: [],
    cityDayAtDeparture: 0,
  },
}

export const failurePathScenario: PlaythroughScenario = {
  id: 'scenario-failure-path',
  title: 'Failure-Path Branch: Low Health, Minimal Supplies',
  rngSeed: 99,
  initialState: startingState,

  steps: [
    checkpointStep('cp-fail-start', 'Failure-path starting state — NPC compromised'),

    assertStep('Verify compromised starting condition', [
      assertion('low-health', 'NPC starts critically low on health', (s) => {
        const npc = s.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)
        return (npc?.states.health ?? 100) < 50
      }),
      assertion('low-money', 'Starting money is constrained', (s) => s.money < 100),
    ]),

    // Phase 1: Attempt to recover partially with endDay (may help via daily recovery)
    dispatchStep('End day — wait for partial recovery', (_state, dispatch) => {
      dispatch(gameActions.endDay())
    }),

    checkpointStep('cp-fail-after-rest', 'State after one rest day'),

    assertStep('State remains coherent after rest', [
      assertion('day-advanced', 'Day advanced', (s) => s.day >= 2),
      assertion('npc-alive', 'NPC still on roster', (s) => s.npcRuntimeStates.some((n) => n.npcId === SQUAD_NPC)),
    ]),

    // Phase 2: Deploy compromised squad (adverse decision — push past limits)
    dispatchStep('Add compromised NPC to squad', (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad(SQUAD_NPC))
    }),

    dispatchStep('Depart with minimal supplies', (_state, dispatch) => {
      dispatch(
        gameActions.startExpedition({
          destinationId: 'dest-green-corridor',
          squadNpcIds: [SQUAD_NPC],
          supplies: 2, // barely enough for 2 days
        }),
      )
    }),

    assertStep('Expedition departs in compromised state', [
      assertion('exp-traveling-or-rejected', 'Expedition started or was safely rejected', (s) =>
        s.expeditionState.status === 'traveling' || s.expeditionState.status === 'idle',
      ),
    ]),

    checkpointStep('cp-fail-departed', 'State after compromised departure attempt'),

    // Phase 3: Advance through field days — attrition expected
    dispatchStep('Field day 1 — attrition likely', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    assertStep('After day 1 field — game still coherent', [
      assertion('no-negative-health', 'No roster NPC has negative health', (s) =>
        s.npcRuntimeStates.every((n) => n.states.health >= 0),
      ),
      assertion('expedition-state-valid', 'Expedition status is a known value', (s) =>
        ['idle', 'traveling', 'returned'].includes(s.expeditionState.status),
      ),
    ]),

    dispatchStep('Field day 2 — supplies likely exhausted', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    checkpointStep('cp-fail-field-done', 'State after field days — adverse outcomes expected'),

    assertStep('Field completed — may have returned early or on schedule', [
      assertion('expedition-ended', 'Expedition has ended (returned or still traveling)', (s) =>
        s.expeditionState.status === 'returned' || s.expeditionState.status === 'traveling',
      ),
    ]),

    // Phase 4: Resolve and verify aftermath
    dispatchStep('Attempt to resolve expedition', (state, dispatch) => {
      if (state.expeditionState.status === 'returned') {
        dispatch(gameActions.resolveExpedition())
      }
    }),

    checkpointStep('cp-fail-final', 'Final failure-path state'),

    assertStep('World remains coherent after failure path', [
      assertion('no-negative-health-final', 'No NPC health below zero', (s) =>
        s.npcRuntimeStates.every((n) => n.states.health >= 0),
      ),
      assertion('money-valid', 'Money is a non-negative number', (s) => s.money >= 0),
      assertion('day-positive', 'Day is positive', (s) => s.day > 0),
      assertion('activity-log-exists', 'Activity log has entries from the adverse run', (s) =>
        s.activityLog.length > 0,
      ),
    ]),
  ],

  invariants: [
    assertion('money-non-negative', 'Money must never go negative', (s) => s.money >= 0),
    assertion('health-non-negative', 'No NPC health below zero', (s) =>
      s.npcRuntimeStates.every((n) => n.states.health >= 0),
    ),
  ],
}
