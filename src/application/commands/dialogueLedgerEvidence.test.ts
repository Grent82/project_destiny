import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import { addPlayerItem } from './inventory/inventoryHelpers'
import { isDialogueChoiceAvailable, resolveDialogueChoice } from './dialogue'

function findChoice(dialogueId: string, choiceId: string) {
  const tree = contentCatalog.dialoguesById.get(dialogueId)
  if (!tree) throw new Error(`Unknown dialogue tree: ${dialogueId}`)
  const choice = tree.nodes.flatMap((n) => n.choices).find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Unknown choice ${choiceId} in ${dialogueId}`)
  return choice
}

describe('item-gated dialogue reactions for ledger evidence (destiny-z3oz)', () => {
  const cases: Array<{ dialogueId: string; choiceId: string; itemId: string }> = [
    { dialogueId: 'dialogue-torvald-messe', choiceId: 'torvald-choice-bureau-ledger', itemId: 'item-ledger-bureau' },
    { dialogueId: 'dialogue-torvald-messe', choiceId: 'torvald-choice-removal-chit', itemId: 'item-chit-ledger-removal' },
    { dialogueId: 'dialogue-old-maret', choiceId: 'maret-choice-bureau-ledger', itemId: 'item-ledger-bureau' },
    { dialogueId: 'dialogue-harlen', choiceId: 'harlen-choice-bureau-ledger', itemId: 'item-ledger-bureau' },
    { dialogueId: 'dialogue-harlen', choiceId: 'harlen-choice-house-debt-negotiate', itemId: 'item-ledger-house-debt' },
    { dialogueId: 'dialogue-marion-vale', choiceId: 'marion-choice-house-debt-advice', itemId: 'item-ledger-house-debt' },
    { dialogueId: 'dialogue-dalen-morke', choiceId: 'dalen-choice-removal-chit', itemId: 'item-chit-ledger-removal' },
  ]

  it.each(cases)('$choiceId is unavailable without $itemId and available once the player holds it', ({ dialogueId, choiceId, itemId }) => {
    const choice = findChoice(dialogueId, choiceId)

    expect(isDialogueChoiceAvailable(initialGameStateSnapshot, dialogueId, choice)).toBe(false)

    const withItem = addPlayerItem(initialGameStateSnapshot, itemId, 1)
    expect(isDialogueChoiceAvailable(withItem, dialogueId, choice)).toBe(true)
  })

  it('Marion Vale expanded ledger-chit reaction: the follow-up choice is available once, then resolved, without needing the item a second time', () => {
    const withItem = addPlayerItem(initialGameStateSnapshot, 'item-chit-ledger-removal', 1)
    const choice = findChoice('dialogue-marion-vale', 'marion-choice-ledger-chit-who-signed')

    expect(isDialogueChoiceAvailable(withItem, 'dialogue-marion-vale', choice)).toBe(true)

    const store = createGameStore({
      ...withItem,
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-ledger-chit',
    })
    store.dispatch(gameActions.selectDialogueChoice({ choiceId: choice.id }))

    const resolvedIds = store.getState().game.resolvedDialogueChoices['dialogue-marion-vale'] ?? []
    expect(resolvedIds).toContain(choice.id)
    expect(isDialogueChoiceAvailable(store.getState().game, 'dialogue-marion-vale', choice)).toBe(false)
  })

  it('resolving the Torvald bureau-ledger choice surfaces the real mainQuestHint outcome', () => {
    const withItem = addPlayerItem(initialGameStateSnapshot, 'item-ledger-bureau', 1)
    const next = resolveDialogueChoice(
      { ...withItem, activeDialogueId: 'dialogue-torvald-messe', activeDialogueNodeId: 'torvald-node-1' },
      'torvald-choice-bureau-ledger',
    )

    expect(next.activeDialogueNodeId).toBe('torvald-node-bureau-ledger')
  })

  it('resolving the Old Maret bureau-ledger choice sets the mainQuestHint clue in state', () => {
    const withItem = addPlayerItem(initialGameStateSnapshot, 'item-ledger-bureau', 1)
    let next = resolveDialogueChoice(
      { ...withItem, activeDialogueId: 'dialogue-old-maret', activeDialogueNodeId: 'maret-node-1' },
      'maret-choice-bureau-ledger',
    )
    next = resolveDialogueChoice(next, 'maret-choice-bureau-ledger-understood')

    expect(next.mainQuest.lastClue).toMatch(/decades-old corrections|genuine record/i)
  })
})
