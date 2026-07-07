import { selectActiveDialoguePresentation } from './dialogue'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'

describe('selectActiveDialoguePresentation effect notes (destiny-pbsw)', () => {
  it('describes an affinity outcome instead of silently falling back to generic closing text', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeDialogueId: 'dialogue-marion-vale',
      activeDialogueNodeId: 'marion-node-court-thoughtful-a',
    })

    const presentation = selectActiveDialoguePresentation(store.getState())
    const choice = presentation?.choices.find((c) => c.id === 'marion-choice-court-reciprocate')

    expect(choice?.effectNotes).toEqual(['Marion Vale warm to you.'])
  })

  it('flags a negative faction-standing outcome with a plain-text warning, no numeric delta', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeDialogueId: 'dialogue-dalen-morke',
      activeDialogueNodeId: 'dalen-node-removal-chit',
    })

    const presentation = selectActiveDialoguePresentation(store.getState())
    const choice = presentation?.choices.find((c) => c.id === 'dalen-choice-removal-chit-close')

    expect(choice?.effectNotes).toEqual(['⚠ Standing weakens with Gilded Court.'])
  })

  it('describes a positive faction-standing outcome without a numeric delta', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeDialogueId: 'dialogue-dalen-morke',
      activeDialogueNodeId: 'dalen-node-alliance',
    })

    const presentation = selectActiveDialoguePresentation(store.getState())
    const choice = presentation?.choices.find((c) => c.id === 'dalen-choice-alliance-close')

    expect(choice?.effectNotes).toEqual(['Standing strengthens with Gilded Court.'])
  })
})
