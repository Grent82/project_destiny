import { afterEach, describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import { gameStateSchema } from '../../domain'
import { dialogueTreeSchema, type DialogueChoice } from '../../domain/dialogue/contracts'
import { isDialogueChoiceAvailable } from './dialogue'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

afterEach(() => {
  contentCatalog.dialoguesById.delete('dialogue-test-faction-standing')
})

describe('dialogue conditions', () => {
  it('supports story-stage and choice-memory gating', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      mainQuest: { stage: 'searching', lastClue: '' },
      resolvedDialogueChoices: {
        'dialogue-marion-vale': ['marion-choice-early-orren'],
      },
    })

    const stageChoice: DialogueChoice = {
      id: 'test-stage',
      label: 'Stage gated',
      nextNodeId: null,
      condition: { type: 'mainQuestStage', value: 'searching' },
    }

    const memoryChoice: DialogueChoice = {
      id: 'test-memory',
      label: 'Memory gated',
      nextNodeId: null,
      condition: { type: 'choiceTaken', value: 'marion-choice-early-orren' },
    }

    expect(isDialogueChoiceAvailable(state, 'dialogue-marion-vale', stageChoice)).toBe(true)
    expect(isDialogueChoiceAvailable(state, 'dialogue-marion-vale', memoryChoice)).toBe(true)
  })
})

describe('dialogue consequence resolution', () => {
  it('can unlock a story lead from dialogue and records resolved choices', () => {
    const store = makeStore({
      day: 3,
      currentDistrictId: 'district-the-pale',
      mainQuest: { stage: 'searching', lastClue: '' },
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
    })

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-early-ledger-a' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-early-orren' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-orren-act' }))

    const state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-orren-wex-rescue')).toBe(true)
    expect(state.resolvedDialogueChoices['dialogue-marion-vale']).toEqual(
      expect.arrayContaining(['marion-choice-early-orren', 'marion-choice-orren-act']),
    )
    expect(state.activeDialogueId).toBeNull()
    expect(state.activityLog[0]?.message).toContain('New lead discovered: Old Ledgers.')
  })

  it('can grant an item from dialogue through typed outcome handling', () => {
    const store = makeStore({
      inventory: [],
    })

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-the-wren', nodeId: 'wren-node-pale' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'wren-choice-thanks' }))

    const state = store.getState().game
    expect(state.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-papers-false-citizen', quantity: 1 }),
      ]),
    )
    expect(state.activityLog[0]?.message).toContain('The Wren gave you False Citizen Papers')
    expect(state.activeDialogueId).toBeNull()
  })

  it('can still apply main-quest hints through application-layer dialogue resolution', () => {
    const store = makeStore()

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-verek-holst', nodeId: 'verek-node-1' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'verek-choice-hear' }))

    const state = store.getState().game
    expect(state.mainQuest.lastClue).toBe('collectors-asking')
    expect(state.activityLog[0]?.message).toContain('collectors-asking')
    expect(state.activeDialogueNodeId).toBe('verek-node-2')
  })

  it('supports faction-standing outcomes without leaving them in the UI layer', () => {
    const customTree = dialogueTreeSchema.parse({
      id: 'dialogue-test-faction-standing',
      npcId: 'npc-marion-vale',
      openingNodeId: 'node-1',
      nodes: [
        {
          id: 'node-1',
          npcId: 'npc-marion-vale',
          text: 'A compact test.',
          choices: [
            {
              id: 'choice-1',
              label: 'Take the risk.',
              nextNodeId: null,
              outcome: {
                type: 'factionStanding',
                targetId: 'faction-civic-compact',
                value: -3,
              },
            },
          ],
        },
      ],
    })

    contentCatalog.dialoguesById.set(customTree.id, customTree)

    const store = makeStore({
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': 12,
      },
    })

    store.dispatch(gameActions.startDialogue({ dialogueId: customTree.id, nodeId: customTree.openingNodeId }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'choice-1' }))

    const state = store.getState().game
    expect(state.factionStandings['faction-civic-compact']).toBe(9)
    expect(state.activityLog[0]?.message).toContain('Standing shifted with')
  })
})
