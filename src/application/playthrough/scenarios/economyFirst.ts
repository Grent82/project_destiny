/**
 * Economy-First Branch Playthrough (destiny-4u73.10)
 *
 * Player biases early decisions toward money, stability, and operational
 * readiness before committing to tactical risk. Exercises resource
 * management differently from the golden path.
 *
 * Key difference from golden path: advance time to accumulate resources and
 * city events, build up NPC readiness through training, then deploy.
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, advanceDaysStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'
import { initialStateWithIda } from '../../commands/testFixtures'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'

const SQUAD_NPC = 'npc-marion-vale'
const MARION_REL_KEY = buildRelationshipKey('player', SQUAD_NPC)

const startingState = {
  ...initialStateWithIda,
  isFirstRun: false,
  money: 500,
  selectedSquadNpcIds: [],
  relationships: {
    ...initialStateWithIda.relationships,
    [MARION_REL_KEY]: {
      affinity: 10,
      respect: 10,
      fear: 5,
      trust: 58,
      loyalty: 40,
    },
  },
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

export const economyFirstScenario: PlaythroughScenario = {
  id: 'scenario-economy-first',
  title: 'Economy-First Branch: Build Resources Before Risk',
  rngSeed: 13,
  initialState: startingState,

  steps: [
    checkpointStep('cp-econ-start', 'Economy-first starting state'),

    assertStep('Verify money-forward start', [
      assertion('has-strong-money', 'Starts with significant funds', (s) => s.money >= 400),
      assertion('no-expedition', 'No expedition active', (s) => s.expeditionState.status === 'idle'),
    ]),

    // Phase 1: Let time pass, accumulate city events and day effects
    advanceDaysStep('Advance 3 days — wait and consolidate', 3),

    assertStep('After consolidation period', [
      assertion('day-advanced', 'Day has advanced by at least 3', (s) => s.day >= 4),
      assertion('money-positive', 'Money remains positive after daily costs', (s) => s.money >= 0),
    ]),

    checkpointStep('cp-econ-consolidated', 'State after consolidation period'),

    // Phase 2: Set NPC training focus before deployment
    dispatchStep('Set NPC training focus to combat', (_state, dispatch) => {
      dispatch(gameActions.setNpcTrainingFocus({ npcId: SQUAD_NPC, skill: 'combat' }))
    }),

    dispatchStep('Add NPC to squad for later deployment', (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad(SQUAD_NPC))
    }),

    assertStep('Squad ready with training focus', [
      assertion('squad-selected', `${SQUAD_NPC} in selected squad`, (s) =>
        s.selectedSquadNpcIds.includes(SQUAD_NPC),
      ),
    ]),

    // Phase 3: Deploy with ample supplies (economy-first: overprepare)
    dispatchStep('Depart expedition — overprepared', (_state, dispatch) => {
      dispatch(
        gameActions.startExpedition({
          destinationId: 'dest-green-corridor',
          squadNpcIds: [SQUAD_NPC],
          supplies: 10, // more than the 2-day minimum
        }),
      )
    }),

    assertStep('Expedition departs with ample supplies', [
      assertion('exp-traveling', 'Expedition is traveling', (s) => s.expeditionState.status === 'traveling'),
      assertion('high-supplies', 'Supplies are ample (≥8)', (s) => s.expeditionState.suppliesRemaining >= 8),
    ]),

    dispatchStep('Day 1 in field', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),
    dispatchStep('Day 2 in field', (_state, dispatch) => {
      dispatch(gameActions.advanceExpeditionDay())
    }),

    assertStep('Expedition returned', [
      assertion('exp-returned', 'Status is returned', (s) => s.expeditionState.status === 'returned'),
    ]),

    dispatchStep('Resolve expedition', (_state, dispatch) => {
      dispatch(gameActions.resolveExpedition())
    }),

    checkpointStep('cp-econ-post-expedition', 'State after economy-first expedition'),

    assertStep('Economy-first post-expedition outcomes', [
      assertion('exp-idle', 'Expedition idle', (s) => s.expeditionState.status === 'idle'),
      assertion('npc-returned', `${SQUAD_NPC} returned to idle`, (s) =>
        s.npcRuntimeStates.find((n) => n.npcId === SQUAD_NPC)?.assignment === 'idle',
      ),
      assertion('money-survives', 'Money remains non-negative', (s) => s.money >= 0),
    ]),
  ],

  invariants: [
    assertion('money-non-negative', 'Money must never go negative', (s) => s.money >= 0),
    assertion('day-positive', 'Day counter positive', (s) => s.day > 0),
  ],
}
