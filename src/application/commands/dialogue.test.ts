import { afterEach, describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import { gameStateSchema } from '../../domain'
import { dialogueTreeSchema, type DialogueChoice } from '../../domain/dialogue/contracts'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { isDialogueChoiceAvailable } from './dialogue'
import { selectVisibleDialogueChoices } from '../selectors/dialogue'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

afterEach(() => {
  contentCatalog.dialoguesById.delete('dialogue-test-faction-standing')
})

function makeActiveQuest(questId: string) {
  const template = contentCatalog.questsById.get(questId)
  if (!template) {
    throw new Error(`Unknown quest template: ${questId}`)
  }
  return createQuestRuntime(template, 1)
}

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

  it('hasEnabledAction gates on state.enabledActions rather than inventory (destiny-4d1u)', () => {
    const withoutAction = gameStateSchema.parse({ ...initialGameStateSnapshot, enabledActions: [] })
    const withAction = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      enabledActions: ['examine-ledger-chit'],
    })

    const choice: DialogueChoice = {
      id: 'test-enabled-action',
      label: 'Enabled-action gated',
      nextNodeId: null,
      condition: { type: 'hasEnabledAction', value: 'examine-ledger-chit' },
    }

    expect(isDialogueChoiceAvailable(withoutAction, 'dialogue-marion-vale', choice)).toBe(false)
    expect(isDialogueChoiceAvailable(withAction, 'dialogue-marion-vale', choice)).toBe(true)
  })

  it('hasEnabledAction stays available after the granting document is removed from inventory (the lockout trap this replaces)', () => {
    // Simulates archiving item-chit-ledger-removal: the item leaves inventory, but the
    // enabledActions entry it granted persists -- unlike the old hasItem gate.
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      enabledActions: ['examine-ledger-chit'],
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        player: { ...initialGameStateSnapshot.inventoryState.player, bagContainers: [] },
      },
    })

    const choice: DialogueChoice = {
      id: 'test-enabled-action-post-archive',
      label: 'Enabled-action gated',
      nextNodeId: null,
      condition: { type: 'hasEnabledAction', value: 'examine-ledger-chit' },
    }

    expect(isDialogueChoiceAvailable(state, 'dialogue-marion-vale', choice)).toBe(true)
  })
})

describe('dialogue consequence resolution', () => {
  it('keeps authored dialogue options in one plain voice without wrapper quotes', () => {
    const wrappedLabels: string[] = []

    for (const tree of contentCatalog.dialoguesById.values()) {
      for (const node of tree.nodes) {
        for (const choice of node.choices) {
          if (/^".*"$/.test(choice.label)) {
            wrappedLabels.push(`${tree.id}:${choice.id}:${choice.label}`)
          }
        }
      }
    }

    expect(wrappedLabels).toEqual([])
  })

  it('restarts future conversations at the opening node after leaving a terminal leaf', () => {
    const store = makeStore()

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-fine' }))

    let state = store.getState().game
    expect(state.activeDialogueNodeId).toBe('marion-node-2')

    store.dispatch(gameActions.endDialogue())
    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))

    state = store.getState().game
    expect(state.activeDialogueNodeId).toBe('marion-node-1')
  })

  it('still resumes a non-terminal conversation node with visible choices', () => {
    // marion-choice-early-game requires hasEnabledAction: examine-ledger-chit (destiny-4d1u: swapped
    // from hasItem so the choice survives archiving the document, not just holding it).
    const store = makeStore({
      enabledActions: ['examine-ledger-chit'],
    })

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-early-game' }))

    let state = store.getState().game
    expect(state.activeDialogueNodeId).toBe('marion-node-early-intro')

    store.dispatch(gameActions.endDialogue())
    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))

    state = store.getState().game
    expect(state.activeDialogueNodeId).toBe('marion-node-early-intro')
  })

  it('gates the crest-ring choice with Old Maret on hasEnabledAction, not hasItem (destiny-1g74)', () => {
    // item-ring-unfamiliar-crest was recategorized from 'gift' to 'document' so its enableAction
    // effect (examine-crest-ring) actually fires on Archive. That made it reachable by the same
    // "archive destroys the item" lockout trap destiny-4d1u fixed for the other 5 documents: a
    // hasItem gate would have permanently hidden this choice the moment the ring is archived,
    // even for a player who never showed it to Maret yet.
    const withoutAction = makeStore({ enabledActions: [] })
    withoutAction.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-old-maret', nodeId: 'maret-node-1' }))
    expect(
      selectVisibleDialogueChoices('maret-node-1')(withoutAction.getState()).map((c) => c.id),
    ).not.toContain('maret-choice-ring')

    const withAction = makeStore({ enabledActions: ['examine-crest-ring'] })
    withAction.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-old-maret', nodeId: 'maret-node-1' }))
    expect(
      selectVisibleDialogueChoices('maret-node-1')(withAction.getState()).map((c) => c.id),
    ).toContain('maret-choice-ring')
  })

  it('consumes Marion one-shot clue topics after the first discussion', () => {
    // marion-choice-ledger-chit/arrangement-below require hasEnabledAction, not hasItem
    // (destiny-4d1u) -- the document may already be archived by the time these are shown.
    const store = makeStore({
      enabledActions: ['examine-ledger-chit', 'examine-vault-note'],
    })

    const visibleChoicesAtRoot = () =>
      selectVisibleDialogueChoices('marion-node-1')(store.getState()).map((choice) => choice.id)

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))
    expect(visibleChoicesAtRoot()).toEqual(
      expect.arrayContaining(['marion-choice-ledger-chit', 'marion-choice-arrangement-below']),
    )

    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-ledger-chit' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-ledger-chit-keep' }))

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))
    expect(visibleChoicesAtRoot()).not.toContain('marion-choice-ledger-chit')
    expect(visibleChoicesAtRoot()).toContain('marion-choice-arrangement-below')

    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-arrangement-below' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'marion-choice-arrangement-below-understood' }))

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-marion-vale', nodeId: 'marion-node-1' }))
    expect(visibleChoicesAtRoot()).not.toContain('marion-choice-arrangement-below')
  })

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
    // destiny-q80n.2: this now unlocks quest-house-fall-reckoning first (the formal single entry
    // point), which successors into quest-orren-wex-rescue on its own completion.
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-house-fall-reckoning')).toBe(true)
    expect(state.resolvedDialogueChoices['dialogue-marion-vale']).toEqual(
      expect.arrayContaining(['marion-choice-early-orren', 'marion-choice-orren-act']),
    )
    expect(state.activeDialogueId).toBeNull()
    expect(state.activityLog[0]?.message).toContain('New lead discovered: What Was Taken.')
  })

  it('can grant an item from dialogue through typed outcome handling', () => {
    const store = makeStore({})

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-the-wren', nodeId: 'wren-node-pale' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'wren-choice-thanks' }))

    const state = store.getState().game
    // Check in new inventoryState system
    const hasItem = state.inventoryState.player.bagContainers.some((c) =>
      c.slots.some((s) => s.itemInstanceId === 'item-papers-false-citizen')
    )
    expect(hasItem).toBe(true)
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

  it('turns Orren into an explicit ladder beat that points to Tessaly and Mira', () => {
    const store = makeStore({
      availableQuestLeads: [],
      activeQuests: [makeActiveQuest('quest-orren-wex-rescue')],
      completedQuestIds: [],
      mainQuest: { stage: 'searching', lastClue: '' },
    })

    store.dispatch(gameActions.completeQuest({ questId: 'quest-orren-wex-rescue' }))

    let state = store.getState().game
    expect(state.mainQuest.stage).toBe('lead-found')
    expect(state.mainQuest.lastClue).toContain('Tessaly Ash')

    store.dispatch(gameActions.startDialogue({ dialogueId: 'dialogue-tessaly-ash', nodeId: 'tessaly-node-1' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'tessaly-choice-mira' }))
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: 'tessaly-choice-mira-confirm' }))

    state = store.getState().game
    expect(state.availableQuestLeads.some((lead) => lead.questId === 'quest-mira-act1-wren-favor')).toBe(true)
    expect(state.activityLog[0]?.message).toContain('New lead discovered: A Name in the Magpie\'s Ledger.')
  })
})
