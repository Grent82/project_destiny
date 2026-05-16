/**
 * First-Hour Funnel Playthrough (destiny-6vhh)
 *
 * Covers the critical first-contact loop for a new player:
 *   1. Search the bureau — receive the ledger chit
 *   2. Verify the chit is in inventory and Marion's clue choice is available
 *   3. Open Marion's dialogue and resolve the chit topic
 *   4. Confirm the choice is recorded and world state reflects it
 *
 * This scenario is the quality gate for the house-search → clue → dialogue
 * funnel described in the UX audit (F1, F3, F7). It operates at command level
 * and does not test UI rendering — UI signal coverage lives in NpcDetailPanel.test.tsx.
 */

import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import { isDialogueChoiceAvailable } from '../../commands/dialogue'
import { contentCatalog } from '../../content/contentCatalog'

const BUREAU_ROOM = 'room-bureau'
const MARION_NPC = 'npc-marion-vale'
const CHIT_ITEM = 'item-chit-ledger-removal'
const CHIT_CHOICE = 'marion-choice-ledger-chit'
const DIALOGUE_ID = 'dialogue-marion-vale'
const OPENING_NODE = 'marion-node-1'

export const firstHourFunnelScenario: PlaythroughScenario = {
  id: 'scenario-first-hour-funnel',
  title: 'First-Hour Funnel: House Search → Clue → Marion Dialogue',
  rngSeed: 42,
  initialState: initialGameStateSnapshot,

  steps: [
    checkpointStep('cp-funnel-start', 'Starting state — bureau unsearched'),

    assertStep('Bureau is unsearched at start', [
      assertion('bureau-unsearched', 'Bureau room not yet searched', (s) =>
        s.house.rooms.find((r) => r.roomId === BUREAU_ROOM)?.searched === false,
      ),
      assertion('no-chit', 'Ledger chit not in inventory at start', (s) =>
        !s.ownedItems.some((o) => o.itemId === CHIT_ITEM),
      ),
    ]),

    dispatchStep('Search the bureau', (_state, dispatch) => {
      dispatch(gameActions.searchRoom(BUREAU_ROOM))
    }),

    checkpointStep('cp-after-search', 'State after bureau search'),

    assertStep('Bureau search grants the ledger chit', [
      assertion('bureau-searched', 'Bureau is now marked as searched', (s) =>
        s.house.rooms.find((r) => r.roomId === BUREAU_ROOM)?.searched === true,
      ),
      assertion('chit-in-inventory', 'Ledger chit is now in inventory', (s) =>
        s.ownedItems.some((o) => o.itemId === CHIT_ITEM && o.location === 'inventory'),
      ),
    ]),

    assertStep('Marion dialogue chit choice is now available', [
      assertion('chit-choice-available', 'marion-choice-ledger-chit condition is met', (s) => {
        const tree = contentCatalog.dialoguesByNpcId.get(MARION_NPC)
        if (!tree) return false
        const choice = tree.nodes.flatMap((n) => n.choices).find((c) => c.id === CHIT_CHOICE)
        if (!choice) return false
        return isDialogueChoiceAvailable(s, tree.id, choice)
      }),
    ]),

    dispatchStep('Open Marion dialogue', (_state, dispatch) => {
      dispatch(gameActions.startDialogue({ dialogueId: DIALOGUE_ID, nodeId: OPENING_NODE }))
    }),

    assertStep('Dialogue is active at opening node', [
      assertion('dialogue-active', 'Active dialogue is Marion\'s', (s) =>
        s.activeDialogueId === DIALOGUE_ID,
      ),
      assertion('at-opening-node', 'Dialogue at opening node', (s) =>
        s.activeDialogueNodeId === OPENING_NODE,
      ),
    ]),

    dispatchStep('Select the ledger chit topic', (_state, dispatch) => {
      dispatch(gameActions.selectDialogueChoice({ choiceId: CHIT_CHOICE }))
    }),

    checkpointStep('cp-after-chit-dialogue', 'State after Marion chit conversation'),

    assertStep('Chit choice is resolved and logged', [
      assertion('choice-recorded', 'Chit choice is in resolvedDialogueChoices', (s) =>
        (s.resolvedDialogueChoices[DIALOGUE_ID] ?? []).includes(CHIT_CHOICE),
      ),
    ]),
  ],

  invariants: [
    {
      id: 'money-non-negative',
      description: 'Money stays non-negative throughout (bureau search may grant marks)',
      predicate: (s) => s.money >= 0,
    },
    {
      id: 'roster-intact',
      description: 'Marion remains on roster throughout',
      predicate: (s) => s.roster.some((n) => n.npcId === MARION_NPC),
    },
  ],
}
