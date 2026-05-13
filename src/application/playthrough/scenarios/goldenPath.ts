/**
 * Golden-Path: Management → Expedition → Return
 *
 * The canonical baseline playthrough for Project Destiny.
 * Covers the core management-to-consequence loop:
 *   1. Initial roster and squad preparation
 *   2. Equipment and resource check
 *   3. Expedition departure with supplies
 *   4. Field days (including possible encounters)
 *   5. Return and post-expedition consequence
 *
 * Assertions validate state progression across:
 *   - Money (not arbitrarily consumed)
 *   - Roster state (NPC deployed → idle)
 *   - Activity log (expedition events recorded)
 *   - Expedition state machine transitions
 *
 * This scenario is the regression baseline for branch comparisons
 * in destiny-4u73.10–13.
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'
import { initialGameStateSnapshot } from '../../store/initialGameState'

const SQUAD_NPC = 'npc-marion-vale'
const EXPEDITION_DEST = 'dest-green-corridor' // 2-day expedition
const EXPEDITION_SUPPLIES = 5

/** Starting state: enough money, single squad member, no pending expedition */
const startingState = {
  ...initialGameStateSnapshot,
  money: 300,
  selectedSquadNpcIds: [],
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

export const goldenPathScenario: PlaythroughScenario = {
  id: 'scenario-golden-path',
  title: 'Golden Path: Management → Expedition → Return',
  rngSeed: 7,
  initialState: startingState,

  steps: [
    // ── Phase 1: Squad preparation ───────────────────────────────────────
    checkpointStep('cp-before-departure', 'State before expedition departure'),

    assertStep('Verify starting conditions', [
      assertion('money-available', 'Starting money is at least 200', (s) => s.money >= 200),
      assertion(
        'npc-on-roster',
        `${SQUAD_NPC} is on the roster`,
        (s) => s.roster.some((n) => n.npcId === SQUAD_NPC),
      ),
      assertion(
        'expedition-idle',
        'No expedition active at start',
        (s) => s.expeditionState.status === 'idle',
      ),
    ]),

    dispatchStep(`Add ${SQUAD_NPC} to selected squad`, (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad(SQUAD_NPC))
    }),

    assertStep('Squad assigned', [
      assertion(
        'squad-selected',
        `${SQUAD_NPC} is in selectedSquadNpcIds`,
        (s) => s.selectedSquadNpcIds.includes(SQUAD_NPC),
      ),
    ]),

    // ── Phase 2: Expedition departure ────────────────────────────────────
    dispatchStep('Depart on expedition', (_state, dispatch) => {
      dispatch(
        gameActions.startExpedition({
          destinationId: EXPEDITION_DEST,
          squadNpcIds: [SQUAD_NPC],
          supplies: EXPEDITION_SUPPLIES,
        }),
      )
    }),

    assertStep('Expedition started', [
      assertion(
        'expedition-traveling',
        'Expedition status is traveling',
        (s) => s.expeditionState.status === 'traveling',
      ),
      assertion(
        'npc-deployed',
        `${SQUAD_NPC} assignment is deployed`,
        (s) => s.roster.find((n) => n.npcId === SQUAD_NPC)?.assignment === 'deployed',
      ),
      assertion(
        'supplies-allocated',
        'Supplies are allocated',
        (s) => s.expeditionState.suppliesRemaining === EXPEDITION_SUPPLIES,
      ),
      assertion(
        'activity-log-departure',
        'Activity log records departure',
        (s) => s.activityLog.some((e) => e.message.toLowerCase().includes('expedition')),
      ),
    ]),

    checkpointStep('cp-expedition-started', 'State after expedition departure'),

    // ── Phase 3: Field days ──────────────────────────────────────────────
    dispatchStep('Advance expedition day 1', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    assertStep('Day 1 complete', [
      assertion(
        'exp-day-1',
        'daysDeparted is 1 after first advance',
        (s) => s.expeditionState.daysDeparted >= 1,
      ),
    ]),

    dispatchStep('Advance expedition day 2', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    assertStep('Expedition returned', [
      assertion(
        'exp-returned',
        'Expedition status is returned after 2 days',
        (s) => s.expeditionState.status === 'returned',
      ),
      assertion(
        'encounters-recorded',
        'At least 2 encounters have been recorded',
        (s) => s.expeditionState.encounters.length >= 2,
      ),
    ]),

    checkpointStep('cp-expedition-returned', 'State when expedition returns'),

    // ── Phase 4: Post-expedition resolution ──────────────────────────────
    dispatchStep('Resolve expedition', (_state, dispatch) => {
      dispatch(gameActions.resolveExpedition())
    }),

    assertStep('Post-expedition state', [
      assertion(
        'expedition-idle-again',
        'Expedition is idle after resolution',
        (s) => s.expeditionState.status === 'idle',
      ),
      assertion(
        'npc-returned-to-idle',
        `${SQUAD_NPC} is idle after expedition resolved`,
        (s) => s.roster.find((n) => n.npcId === SQUAD_NPC)?.assignment === 'idle',
      ),
      assertion(
        'day-advanced',
        'Day has advanced beyond starting day (endDay called during resolve)',
        (s) => s.day > startingState.day,
      ),
      assertion(
        'activity-log-nonempty',
        'Activity log has events from the expedition',
        (s) => s.activityLog.length > 0,
      ),
    ]),

    checkpointStep('cp-post-expedition', 'Final state after expedition resolution'),
  ],

  invariants: [
    assertion('money-non-negative', 'Player money must never go negative', (s) => s.money >= 0),
    assertion('day-positive', 'Day counter must be positive', (s) => s.day > 0),
    assertion(
      'roster-alive',
      'Every roster NPC has health ≥ 0',
      (s) => s.roster.every((n) => n.states.health >= 0),
    ),
  ],
}
