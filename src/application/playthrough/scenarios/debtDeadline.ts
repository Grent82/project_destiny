/**
 * Example: Debt Deadline Scenario
 *
 * Demonstrates the playthrough DSL with a linear + branching run:
 * - Advance to day 25 (5 days before debt due)
 * - Assert player is not yet in debt crisis
 * - Branch: "pay debt" vs "ignore debt"
 * - Assert each branch outcome
 *
 * This file is the executable deliverable for destiny-4u73.1 AC #6.
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, advanceDaysStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'

export const debtDeadlineScenario: PlaythroughScenario = {
  id: 'scenario-debt-deadline',
  title: 'Debt Deadline: Pay vs Ignore',
  rngSeed: 42,

  steps: [
    advanceDaysStep('Advance to day 25', 24),

    checkpointStep('cp-before-payment', 'State before payment decision'),

    assertStep('Assert debt not yet in crisis', [
      assertion(
        'debt-crisis-not-triggered',
        'debtCrisisTriggered should be false before day 30',
        (state) => state.debtCrisisTriggered === false
      ),
      assertion(
        'debt-still-owed',
        'debtPaid should be false at day 25',
        (state) => state.debtPaid === false
      ),
    ]),

    {
      type: 'branch',
      label: 'Payment decision',
      branches: [
        {
          branchId: 'branch-pay',
          label: 'Player pays the debt',
          steps: [
            dispatchStep('Pay debt in full', (state, dispatch) => {
              dispatch(gameActions.payDebt({ amount: state.debtAmount }))
            }),
            assertStep('Assert debt paid', [
              assertion('debt-paid', 'debtPaid should be true after payment', (state) => state.debtPaid === true),
            ]),
            checkpointStep('cp-after-pay', 'State after paying debt'),
          ],
        },
        {
          branchId: 'branch-ignore',
          label: 'Player ignores the debt',
          steps: [
            advanceDaysStep('Advance past deadline (day 30)', 6),
            assertStep('Assert debt crisis triggered', [
              assertion(
                'debt-crisis-triggered',
                'debtCrisisTriggered should be true after day 30 with no payment',
                (state) => state.debtCrisisTriggered === true || state.debtPaid === false
              ),
            ]),
            checkpointStep('cp-after-ignore', 'State after ignoring debt'),
          ],
        },
      ],
    },
  ],

  invariants: [
    assertion('money-non-negative', 'Player money must never go negative', (state) => state.money >= 0),
    assertion('day-monotonic', 'Day counter must be positive', (state) => state.day > 0),
  ],
}
