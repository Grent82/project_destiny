import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectActiveDialoguePresentation } from './dialogue'

function storeAt(dialogueId: string, nodeId: string) {
  return createGameStore({
    ...initialGameStateSnapshot,
    activeDialogueId: dialogueId,
    activeDialogueNodeId: nodeId,
  })
}

function choiceById(dialogueId: string, nodeId: string, choiceId: string) {
  const presentation = selectActiveDialoguePresentation(storeAt(dialogueId, nodeId).getState())
  const choice = presentation?.choices.find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Expected choice ${choiceId} to be visible in ${dialogueId}/${nodeId}`)
  return choice
}

describe('selectActiveDialoguePresentation — consequence preview (destiny-pbsw)', () => {
  it('shows a positive-toned note with the real numeric delta for a trust outcome', () => {
    const choice = choiceById('dialogue-marion-vale', 'marion-node-court-thoughtful-a', 'marion-choice-court-honest')
    expect(choice.effectNotes).toHaveLength(1)
    expect(choice.effectNotes[0]).toEqual({ text: '⬆ Trust +5 with Marion Vale', tone: 'positive' })
  })

  it('shows a positive-toned note for an affinity outcome (previously fell through to a generic fallback)', () => {
    const choice = choiceById('dialogue-marion-vale', 'marion-node-court-thoughtful-a', 'marion-choice-court-reciprocate')
    expect(choice.effectNotes).toHaveLength(1)
    expect(choice.effectNotes[0]).toEqual({ text: '⬆ Affinity +8 with Marion Vale', tone: 'positive' })
  })

  it('shows a generic closing note for a choice with no outcome', () => {
    const choice = choiceById('dialogue-marion-vale', 'marion-node-court-thoughtful-a', 'marion-choice-court-deflect')
    expect(choice.effectNotes).toEqual([
      { text: 'The topic shifts under the pressure of your answer.', tone: 'neutral' },
    ])
  })

  it('shows a negative-toned, risk-flagged note with the real magnitude for a negative factionStanding outcome', () => {
    const choice = choiceById('dialogue-veyran', 'veyran-node-warn', 'veyran-choice-warn-close')
    expect(choice.effectNotes).toHaveLength(1)
    expect(choice.effectNotes[0]).toEqual({
      text: '⚠ ⬇ House Merrow standing -3',
      tone: 'negative',
    })
  })
})
