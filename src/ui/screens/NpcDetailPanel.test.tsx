import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore, selectRosterDetail } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { initialStateWithIda } from '../../application/commands/testFixtures'
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

function renderIdaPanel(storeState = initialStateWithIda) {
  const store = createGameStore(storeState)
  const detail = selectRosterDetail(store.getState(), 'npc-ida-rhys')
  if (!detail) throw new Error('Ida not on roster in test state')
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

describe('NpcDetailPanel — courtship loop', () => {
  it('shows a player-facing courtship action for romance-eligible NPCs at the house', () => {
    renderIdaPanel()

    expect(screen.getByRole('button', { name: 'Court' })).toBeInTheDocument()
  })

  it('records visible courtship aftermath after the player courts an NPC', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel({
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        'player→npc-ida-rhys': {
          affinity: 18,
          trust: 28,
          fear: 10,
          respect: 0,
          loyalty: 0,
        },
        'npc-ida-rhys→player': {
          affinity: 0,
          trust: 0,
          fear: 0,
          respect: 0,
          loyalty: 20,
        },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Court' }))
    await user.click(screen.getByRole('tab', { name: 'Relations' }))

    expect(screen.getByText(/Courtship History/i)).toBeInTheDocument()
    expect(screen.getByText(/You make time to court Ida Rhys/i)).toBeInTheDocument()
    expect(store.getState().game.relationships['player→npc-ida-rhys']?.intimacyStage).toBe('affinity')
  })
})
