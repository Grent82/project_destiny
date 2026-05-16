import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore, selectRosterDetail } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { isDialogueChoiceAvailable } from '../../application/commands/dialogue'
import { contentCatalog } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { NpcDetailPanel } from './NpcDetailPanel'

const MARION_ID = 'npc-marion-vale'

function renderMarionPanel(ownedItems: typeof initialGameStateSnapshot.ownedItems = []) {
  const store = createGameStore({ ...initialGameStateSnapshot, ownedItems })
  const detail = selectRosterDetail(store.getState(), MARION_ID)
  if (!detail) throw new Error('Marion not on roster in initial state')
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <NpcDetailPanel detail={detail} />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

describe('NpcDetailPanel — Marion clue discoverability', () => {
  it('shows no new-topic hint when the player holds no relevant items', () => {
    renderMarionPanel()
    expect(screen.queryByText(/Something on your mind worth raising/i)).toBeNull()
  })

  it('shows a new-topic hint when the bureau ledger chit is in inventory', () => {
    renderMarionPanel([
      {
        instanceId: 'inst-chit-1',
        itemId: 'item-chit-ledger-removal',
        location: 'inventory',
        quantity: 1,
      },
    ])
    expect(screen.getByText(/Something on your mind worth raising/i)).toBeInTheDocument()
  })

  it('shows a new-topic hint when the arrangement note is in inventory', () => {
    renderMarionPanel([
      {
        instanceId: 'inst-note-1',
        itemId: 'item-note-arrangement-below',
        location: 'inventory',
        quantity: 1,
      },
    ])
    expect(screen.getByText(/Something on your mind worth raising/i)).toBeInTheDocument()
  })
})

describe('Marion clue → dialogue choice availability', () => {
  it('ledger chit choice is gated behind hasItem and unavailable without the item', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const chitChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-ledger-chit')!

    const stateWithout = { ...initialGameStateSnapshot, ownedItems: [] }
    expect(isDialogueChoiceAvailable(stateWithout, tree.id, chitChoice)).toBe(false)
  })

  it('ledger chit choice becomes available when the item is in inventory', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const chitChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-ledger-chit')!

    const stateWith = {
      ...initialGameStateSnapshot,
      ownedItems: [
        {
          instanceId: 'inst-chit-1',
          itemId: 'item-chit-ledger-removal',
          location: 'inventory' as const,
          quantity: 1,
        },
      ],
    }
    expect(isDialogueChoiceAvailable(stateWith, tree.id, chitChoice)).toBe(true)
  })

  it('arrangement note choice becomes available when the item is in inventory', () => {
    const tree = contentCatalog.dialoguesByNpcId.get(MARION_ID)!
    const noteChoice = tree.nodes
      .flatMap((n) => n.choices)
      .find((c) => c.id === 'marion-choice-arrangement-below')!

    const stateWith = {
      ...initialGameStateSnapshot,
      ownedItems: [
        {
          instanceId: 'inst-note-1',
          itemId: 'item-note-arrangement-below',
          location: 'inventory' as const,
          quantity: 1,
        },
      ],
    }
    expect(isDialogueChoiceAvailable(stateWith, tree.id, noteChoice)).toBe(true)
  })
})
