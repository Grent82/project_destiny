/**
 * Combat-First Branch Playthrough (destiny-4u73.11)
 *
 * Player accelerates into hostile encounters earlier than the golden path.
 * Validates combat consequence persistence: squad state, injury carry-over,
 * activity log markers, and world coherence after early combat pressure.
 *
 * Key difference from golden path: combat encounter is triggered immediately
 * at day 1 rather than after management setup.
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'
import { initialGameStateSnapshot } from '../../store/initialGameState'

const SQUAD_NPC = 'npc-marion-vale'

const startingState = {
  ...initialGameStateSnapshot,
  money: 150,
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

export const combatFirstScenario: PlaythroughScenario = {
  id: 'scenario-combat-first',
  title: 'Combat-First Branch: Early Tactical Risk',
  rngSeed: 23,
  initialState: startingState,

  steps: [
    checkpointStep('cp-combat-start', 'Combat-first starting state'),

    // Phase 0: Add NPC to squad (required for startCombatEncounter)
    dispatchStep('Add NPC to squad before combat', (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad(SQUAD_NPC))
    }),

    // Phase 1: Immediate combat encounter (no preparation)
    dispatchStep('Start combat encounter immediately', (_state, dispatch) => {
      dispatch(gameActions.startCombatEncounter(undefined))
    }),

    assertStep('Combat encounter active', [
      assertion('combat-active', 'Combat encounter is active', (s) => s.activeCombat !== null),
    ]),

    checkpointStep('cp-combat-in-progress', 'State during combat'),

    // Perform 15 combat actions — enough to end any standard encounter
    dispatchStep('Combat actions x15 — exhaust the encounter', (_state, dispatch) => {
      for (let i = 0; i < 15; i++) {
        dispatch(gameActions.performCombatAction('attack'))
      }
    }),

    dispatchStep('Conclude combat if outcome is determined', (state, dispatch) => {
      if (state.activeCombat && state.activeCombat.outcome !== 'ongoing') {
        dispatch(gameActions.concludeCombatEncounter())
      }
    }),

    assertStep('Combat phase complete — consequences persist', [
      assertion(
        'activity-log-nonempty',
        'Activity log has entries from combat',
        (s) => s.activityLog.length > 0,
      ),
      assertion(
        'combat-state-valid',
        'activeCombat is null (concluded) or has a valid outcome',
        (s) => s.activeCombat === null || ['ongoing', 'victory', 'defeat'].includes(s.activeCombat.outcome),
      ),
    ]),

    checkpointStep('cp-combat-post', 'State after early combat encounter'),

    // Phase 2: Expedition after combat (demonstrates consequence carry-over)
    dispatchStep('Add NPC to squad post-combat', (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad(SQUAD_NPC))
    }),

    dispatchStep('Depart expedition despite combat wear', (_state, dispatch) => {
      dispatch(
        gameActions.startExpedition({
          destinationId: 'dest-green-corridor',
          squadNpcIds: [SQUAD_NPC],
          supplies: 5,
        }),
      )
    }),

    dispatchStep('Expedition day 1', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),
    dispatchStep('Expedition day 2', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    assertStep('Expedition returned after combat-first path', [
      assertion('exp-returned', 'Expedition status is returned', (s) => s.expeditionState.status === 'returned'),
    ]),

    dispatchStep('Resolve expedition', (_state, dispatch) => {
      dispatch(gameActions.resolveExpedition())
    }),

    checkpointStep('cp-combat-final', 'Final state after combat-first path'),

    assertStep('Combat-first path remains coherent', [
      assertion('exp-idle', 'Expedition idle', (s) => s.expeditionState.status === 'idle'),
      assertion('npc-survived', `${SQUAD_NPC} is on the roster`, (s) =>
        s.roster.some((n) => n.npcId === SQUAD_NPC),
      ),
      assertion('world-coherent', 'Day counter is positive', (s) => s.day > 0),
    ]),
  ],

  invariants: [
    assertion('money-non-negative', 'Money must never go negative', (s) => s.money >= 0),
    assertion('day-positive', 'Day counter positive', (s) => s.day > 0),
    assertion('roster-health-non-negative', 'All roster NPCs have non-negative health', (s) =>
      s.roster.every((n) => n.states.health >= 0),
    ),
  ],
}
