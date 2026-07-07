import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import { isDialogueChoiceAvailable, resolveDialogueChoice } from './dialogue'
import type { GameState } from '../../domain'

function findChoice(dialogueId: string, choiceId: string) {
  const tree = contentCatalog.dialoguesById.get(dialogueId)
  if (!tree) throw new Error(`Unknown dialogue tree: ${dialogueId}`)
  const choice = tree.nodes.flatMap((n) => n.choices).find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Unknown choice ${choiceId} in ${dialogueId}`)
  return choice
}

// destiny-4d1u: these choices used to gate on hasItem, which broke once the document was
// archived (the only way to actually examine it). They now gate on hasEnabledAction, keyed
// on the action the document's own enableAction typedEffect grants.
function withEnabledAction(action: string): GameState {
  return { ...initialGameStateSnapshot, enabledActions: [action] }
}

describe('item-gated dialogue reactions for ledger evidence (destiny-z3oz)', () => {
  const cases: Array<{ dialogueId: string; choiceId: string; action: string }> = [
    { dialogueId: 'dialogue-torvald-messe', choiceId: 'torvald-choice-bureau-ledger', action: 'use-as-cover-document' },
    { dialogueId: 'dialogue-torvald-messe', choiceId: 'torvald-choice-removal-chit', action: 'examine-ledger-chit' },
    { dialogueId: 'dialogue-old-maret', choiceId: 'maret-choice-bureau-ledger', action: 'use-as-cover-document' },
    { dialogueId: 'dialogue-harlen', choiceId: 'harlen-choice-bureau-ledger', action: 'use-as-cover-document' },
    { dialogueId: 'dialogue-harlen', choiceId: 'harlen-choice-house-debt-negotiate', action: 'review-house-accounts' },
    { dialogueId: 'dialogue-marion-vale', choiceId: 'marion-choice-house-debt-advice', action: 'review-house-accounts' },
    { dialogueId: 'dialogue-dalen-morke', choiceId: 'dalen-choice-removal-chit', action: 'examine-ledger-chit' },
  ]

  it.each(cases)('$choiceId is unavailable without $action and available once the player has examined the document', ({ dialogueId, choiceId, action }) => {
    const choice = findChoice(dialogueId, choiceId)

    expect(isDialogueChoiceAvailable(initialGameStateSnapshot, dialogueId, choice)).toBe(false)

    const withAction = withEnabledAction(action)
    expect(isDialogueChoiceAvailable(withAction, dialogueId, choice)).toBe(true)
  })

  it('Marion Vale expanded ledger-chit reaction: the follow-up choice is available once, then resolved, without needing the item a second time', () => {
    const withAction = withEnabledAction('examine-ledger-chit')
    const choice = findChoice('dialogue-marion-vale', 'marion-choice-ledger-chit-who-signed')

    expect(isDialogueChoiceAvailable(withAction, 'dialogue-marion-vale', choice)).toBe(true)

    const store = createGameStore({
      ...withAction,
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-ledger-chit',
    })
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: choice.id }))

    const resolvedIds = store.getState().game.resolvedDialogueChoices['dialogue-marion-vale'] ?? []
    expect(resolvedIds).toContain(choice.id)
    expect(isDialogueChoiceAvailable(store.getState().game, 'dialogue-marion-vale', choice)).toBe(false)
  })

  it('resolving the Torvald bureau-ledger choice surfaces the real mainQuestHint outcome', () => {
    const withAction = withEnabledAction('use-as-cover-document')
    const next = resolveDialogueChoice(
      { ...withAction, activeDialogueId: 'dialogue-torvald-messe', activeDialogueNodeId: 'torvald-node-1' },
      'torvald-choice-bureau-ledger',
    )

    expect(next.activeDialogueNodeId).toBe('torvald-node-bureau-ledger')
  })

  it('resolving the Old Maret bureau-ledger choice sets the mainQuestHint clue in state', () => {
    const withAction = withEnabledAction('use-as-cover-document')
    let next = resolveDialogueChoice(
      { ...withAction, activeDialogueId: 'dialogue-old-maret', activeDialogueNodeId: 'maret-node-1' },
      'maret-choice-bureau-ledger',
    )
    next = resolveDialogueChoice(next, 'maret-choice-bureau-ledger-understood')

    expect(next.mainQuest.lastClue).toMatch(/decades-old corrections|genuine record/i)
  })
})
