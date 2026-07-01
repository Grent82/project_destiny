import { render, screen, within } from '@testing-library/react'
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

function createInventoryWithItems(items: Array<{ itemId: string }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [
        {
          containerId: 'container-test',
          containerType: 'backpack' as const,
          ownerId: 'player',
          maxSlots: 20,
          slots: items.map((item, i) => ({ slotId: `slot-${i}`, itemInstanceId: item.itemId as string | null, quantity: 1 })),
          locked: false,
        },
      ],
      usedBagSlots: items.length,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    npcInventories: {},
    sharedContainers: [],
    itemRegistry: {},
  }
}

function renderMarionPanel(ownedItems: Array<{ itemId: string }> = []) {
  const store = createGameStore({ ...initialGameStateSnapshot, inventoryState: createInventoryWithItems(ownedItems) })
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

function withKitchenState<T extends typeof initialStateWithIda>(state: T, roomState: 'intact' | 'damaged') {
  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((room) =>
        room.roomId === 'room-kitchen' ? { ...room, state: roomState } : room,
      ),
    },
  }
}

function stateWithPlayerHeldIda() {
  return {
    ...initialStateWithIda,
    roster: initialStateWithIda.roster.map((npc) =>
      npc.npcId === 'npc-ida-rhys'
        ? {
            ...npc,
            bondStatus: {
              holderId: 'player',
              contractValue: 40,
              termDays: 30,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: null,
              marketValue: 120,
              ownerType: 'player' as const,
              bondStartDay: 1,
            },
          }
        : npc,
    ),
  }
}

function stateWithTransferredIda() {
  return {
    ...initialStateWithIda,
    money: 500,
    bondedPersonsRegistry: {
      'buyer-compact-registrar': ['npc-ida-rhys'],
    },
    roster: initialStateWithIda.roster.map((npc) =>
      npc.npcId === 'npc-ida-rhys'
        ? {
            ...npc,
            assignment: 'transferred' as const,
            bondStatus: {
              holderId: 'buyer-compact-registrar',
              contractValue: 40,
              termDays: 30,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: 1,
              marketValue: 120,
              ownerType: 'npc' as const,
              bondStartDay: 1,
            },
          }
        : npc,
    ),
  }
}

describe('NpcDetailPanel — Marion clue discoverability', () => {
  it('shows no new-topic hint when the player holds no relevant items', () => {
    renderMarionPanel()
    expect(screen.queryByText(/Something on your mind worth raising/i)).toBeNull()
  })

  it('shows a new-topic hint when the bureau ledger chit is in inventory', () => {
    renderMarionPanel([
      {
        itemId: 'item-chit-ledger-removal',
      },
    ])
    expect(screen.getByText(/Something on your mind worth raising/i)).toBeInTheDocument()
  })

  it('shows a new-topic hint when the arrangement note is in inventory', () => {
    renderMarionPanel([
      {
        itemId: 'item-note-arrangement-below',
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
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        player: {
          ...initialGameStateSnapshot.inventoryState.player,
          bagContainers: [
            {
              containerId: 'container-test',
              containerType: 'backpack' as const,
              ownerId: 'player',
              maxSlots: 20,
              slots: [{ slotId: 'slot-chit', itemInstanceId: 'item-chit-ledger-removal' as string | null, quantity: 1 }],
              locked: false,
            },
          ],
          usedBagSlots: 1,
          equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
        },
        npcInventories: {},
        sharedContainers: [],
        itemRegistry: {},
      },
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
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        player: {
          ...initialGameStateSnapshot.inventoryState.player,
          bagContainers: [
            {
              containerId: 'container-test',
              containerType: 'backpack' as const,
              ownerId: 'player',
              maxSlots: 20,
              slots: [{ slotId: 'slot-note', itemInstanceId: 'item-note-arrangement-below' as string | null, quantity: 1 }],
              locked: false,
            },
          ],
          usedBagSlots: 1,
          equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
        },
        npcInventories: {},
        sharedContainers: [],
        itemRegistry: {},
      },
    }
    expect(isDialogueChoiceAvailable(stateWith, tree.id, noteChoice)).toBe(true)
  })
})

describe('NpcDetailPanel — courtship loop', () => {
  it('shows a player-facing courtship action for romance-eligible NPCs at the house', () => {
    renderIdaPanel()

    expect(screen.getByRole('button', { name: 'Talk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spend Time' })).toBeInTheDocument()
  })

  it('reveals conversation and activity actions only after choosing Talk or Spend Time', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    expect(screen.queryByRole('button', { name: 'Talk Deeply' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Court' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Offer Gift' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Talk' }))

    const talkMenu = screen.getByRole('group', { name: 'Talk options' })
    expect(within(talkMenu).getByRole('button', { name: 'Speak' })).toBeInTheDocument()
    expect(within(talkMenu).getByRole('button', { name: 'Talk Deeply' })).toBeInTheDocument()
    expect(within(talkMenu).getByRole('button', { name: 'Court' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Spend Time options' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))

    const timeMenu = screen.getByRole('group', { name: 'Spend Time options' })
    expect(within(timeMenu).getByRole('button', { name: 'Offer Gift' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Propose Date' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Cook Together' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Decorate Room' })).toBeInTheDocument()
    expect(within(timeMenu).getByRole('button', { name: 'Spend Night Together' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Talk options' })).toBeNull()
  })

  it('closes Talk and Spend Time when the same menu button is clicked twice', async () => {
    const user = userEvent.setup()
    renderIdaPanel()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.getByRole('group', { name: 'Talk options' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    expect(screen.queryByRole('group', { name: 'Talk options' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    expect(screen.getByRole('group', { name: 'Spend Time options' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spend Time' }))
    expect(screen.queryByRole('group', { name: 'Spend Time options' })).toBeNull()
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

    await user.click(screen.getByRole('button', { name: 'Talk' }))
    await user.click(screen.getByRole('button', { name: 'Court' }))
    await user.click(screen.getByRole('tab', { name: 'Relations' }))

    expect(screen.getByText(/Courtship History/i)).toBeInTheDocument()
    expect(screen.getByText(/You make time to court Ida Rhys/i)).toBeInTheDocument()
    expect(store.getState().game.relationships['player→npc-ida-rhys']?.intimacyStage).toBe('affinity')
  })
})

describe('NpcDetailPanel — bond status visibility', () => {
  it('shows house-held bond details and an honest kitchen gate when the room is still damaged', () => {
    renderIdaPanel(stateWithPlayerHeldIda())

    expect(screen.getByRole('heading', { name: 'Bond Status' })).toBeInTheDocument()
    expect(screen.getByText(/Held by House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/Debt settlement/i)).toBeInTheDocument()
    expect(screen.getByText(/Contract buyout: 40 Marks/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Release from bond' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Offer for transfer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Repair kitchen for food service' })).toBeDisabled()
    expect(screen.getByText(/Repair the kitchen before assigning food service/i)).toBeInTheDocument()
  })

  it('shows the food-service action once the kitchen is repaired', () => {
    renderIdaPanel(withKitchenState(stateWithPlayerHeldIda(), 'intact'))

    expect(screen.getByRole('button', { name: 'Place in food service' })).toBeInTheDocument()
  })

  it('shows transferred holder details and rescue actions for NPC-held bonds', () => {
    renderIdaPanel(stateWithTransferredIda())

    expect(screen.getByRole('heading', { name: 'Bond Status' })).toBeInTheDocument()
    expect(screen.getByText(/Transferred to Compact Registrar/i)).toBeInTheDocument()
    expect(screen.getByText(/Legal buyout: 180 Marks/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy freedom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extract quietly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seize by force' })).toBeInTheDocument()
  })

  it('can place a player-held bonded NPC into kitchen food service', async () => {
    const user = userEvent.setup()
    const store = renderIdaPanel(withKitchenState(stateWithPlayerHeldIda(), 'intact'))

    await user.click(screen.getByRole('button', { name: 'Place in food service' }))

    const ida = store.getState().game.roster.find((npc) => npc.npcId === 'npc-ida-rhys')
    expect(ida?.assignment).toBe('working')
    expect(ida?.roomAssignment).toBe('room-kitchen')
  })
})
