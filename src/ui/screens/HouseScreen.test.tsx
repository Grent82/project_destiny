import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { HouseScreen } from './HouseScreen'

function renderHouseScreen(storeState = initialGameStateSnapshot) {
  const store = createGameStore(storeState)
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <HouseScreen />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

function roomLedger() {
  return screen.getByRole('complementary', { name: 'Room ledger' })
}

async function selectRoomOnPlan(user: ReturnType<typeof userEvent.setup>, roomNamePattern: RegExp) {
  await user.click(screen.getByRole('button', { name: roomNamePattern }))
}

describe('HouseScreen — search result lifecycle', () => {
  it('shows full discovery payload immediately after searching (fresh state)', async () => {
    const user = userEvent.setup()
    renderHouseScreen()

    await selectRoomOnPlan(user, /^Bureau —/)
    await user.click(within(roomLedger()).getByRole('button', { name: 'Search' }))

    // Confirm the search in the confirmation modal
    const confirmButton = screen.getByRole('button', { name: /Search room/i })
    await user.click(confirmButton)

    const panel = roomLedger()
    // Full discovery message visible in fresh state
    expect(within(panel).getByText(/A forgotten strongbox behind the panelling/i)).toBeInTheDocument()
    // Flavor finds visible in fresh state
    expect(within(panel).getByText(/22 Marks in pre-Breach reserve coin/i)).toBeInTheDocument()
    // Actionable find visible in fresh state
    expect(
      within(panel).getByText(/Removal chit proving two house ledgers were taken during the seizure/i),
    ).toBeInTheDocument()
  })

  it('collapses to compact state for a room that was already searched on load', async () => {
    const user = userEvent.setup()
    const preSearched = {
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        rooms: initialGameStateSnapshot.house.rooms.map((r) =>
          r.roomId === 'room-bureau' ? { ...r, searched: true } : r,
        ),
      },
    }
    renderHouseScreen(preSearched)

    await selectRoomOnPlan(user, /^Bureau —/)
    const panel = roomLedger()

    // Compact "Searched" mark is present
    expect(within(panel).getByText('✓ Searched')).toBeInTheDocument()

    // Full discovery message is NOT shown in compact/archived state
    expect(within(panel).queryByText(/A forgotten strongbox behind the panelling/i)).toBeNull()
    // Flavor finds are NOT shown
    expect(within(panel).queryByText(/22 Marks in pre-Breach reserve coin/i)).toBeNull()

    // Actionable find IS shown (persistent — still needs resolution)
    expect(
      within(panel).getByText(/Removal chit proving two house ledgers were taken during the seizure/i),
    ).toBeInTheDocument()
    // Follow-up guidance IS shown
    expect(within(panel).getByText(/Show the removal chit to Marion/i)).toBeInTheDocument()
  })

  it('shows compact searched state for a room with no unresolved leads', async () => {
    const user = userEvent.setup()
    const preSearched = {
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        rooms: initialGameStateSnapshot.house.rooms.map((r) =>
          r.roomId === 'room-kitchen' ? { ...r, searched: true } : r,
        ),
      },
    }
    renderHouseScreen(preSearched)

    await selectRoomOnPlan(user, /^Kitchen —/)
    const panel = roomLedger()
    expect(within(panel).getByText('✓ Searched')).toBeInTheDocument()
    // Kitchen has no actionableFinds — just a simple searched state
    expect(within(panel).queryByText(/survivors cache/i)).toBeNull()
  })
})

describe('HouseScreen — repair outcomes', () => {
  it('shows explicit payoff statement before repairing bureau', async () => {
    const user = userEvent.setup()
    renderHouseScreen()
    await selectRoomOnPlan(user, /^Bureau —/)
    const panel = roomLedger()
    // Bureau copy explains what repair unlocks before the player pays
    expect(within(panel).getByText(/working accounts office/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Repair to track debts/i)).toBeInTheDocument()
  })

  it('shows the repair duration alongside cost on the repair button (destiny-fvoa)', async () => {
    const user = userEvent.setup()
    // Bureau is 'damaged' (repairCost: 15) -- REPAIR_DAYS_BY_STATE maps damaged -> 3 days.
    const richState = { ...initialGameStateSnapshot, money: 100 }
    renderHouseScreen(richState)

    await selectRoomOnPlan(user, /^Bureau —/)
    expect(within(roomLedger()).getByRole('button', { name: /Repair — 15 Mk · 3 days/i })).toBeInTheDocument()
  })

  it('shows the repair duration in the shortfall note when the room cannot be afforded yet (destiny-fvoa)', async () => {
    const user = userEvent.setup()
    // Study is 'stripped' (repairCost: 35) -- REPAIR_DAYS_BY_STATE maps stripped -> 7 days.
    const poorState = { ...initialGameStateSnapshot, money: 0 }
    renderHouseScreen(poorState)

    await selectRoomOnPlan(user, /^Study —/)
    expect(within(roomLedger()).getByText(/Needs 35 Mk \(short 35 Mk\) · 7 days to repair/i)).toBeInTheDocument()
  })

  it('shows post-repair follow-up link for bureau after repair', async () => {
    const user = userEvent.setup()
    // Give player enough money to afford bureau repair (15 Mk)
    const richState = { ...initialGameStateSnapshot, money: 100 }
    const store = renderHouseScreen(richState)

    await selectRoomOnPlan(user, /^Bureau —/)
    await user.click(within(roomLedger()).getByRole('button', { name: /Repair/i }))

    expect(within(roomLedger()).getByText(/Repairs underway/i)).toBeInTheDocument()

    act(() => {
      store.dispatch(gameActions.endDay())
      store.dispatch(gameActions.endDay())
      store.dispatch(gameActions.endDay())
    })

    // After the timer completes: post-repair follow-up link visible in the panel
    const panel = roomLedger()
    expect(within(panel).getByText(/Accounts are in order/i)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /View House Accounts/i })).toBeInTheDocument()
  })

  it('shows explicit payoff for kitchen before repair', async () => {
    const user = userEvent.setup()
    renderHouseScreen()
    await selectRoomOnPlan(user, /^Kitchen —/)
    expect(within(roomLedger()).getByText(/daily wage drops by 1 Mark/i)).toBeInTheDocument()
  })

  it('shows explicit payoff for master chamber before repair', async () => {
    const user = userEvent.setup()
    renderHouseScreen()
    await selectRoomOnPlan(user, /^Master's Chamber —/)
    expect(within(roomLedger()).getByText(/faction contacts/i)).toBeInTheDocument()
  })

  it('shows a Short figure on the status bar when total repair cost exceeds marks on hand (destiny-fvoa)', () => {
    const poorState = { ...initialGameStateSnapshot, money: 100 }
    renderHouseScreen(poorState)

    // initial-game-state.json's total repair cost across all rooms is well above 100 Mk on hand.
    expect(screen.getByText(/^Short:/)).toBeInTheDocument()
  })

  it('does not show a Short figure once total repair cost is fully affordable', () => {
    const richState = {
      ...initialGameStateSnapshot,
      money: 100000,
    }
    renderHouseScreen(richState)

    expect(screen.queryByText(/^Short:/)).toBeNull()
  })

  it('shows assigned room function effect summaries when a purpose is set', async () => {
    const user = userEvent.setup()
    const assignedState = {
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        rooms: initialGameStateSnapshot.house.rooms.map((room) =>
          room.roomId === 'room-bureau'
            ? { ...room, state: 'intact' as const, repairCost: 0, roomFunction: 'archive' as const }
            : room,
        ),
      },
    }
    renderHouseScreen(assignedState)

    await selectRoomOnPlan(user, /^Bureau —/)
    const panel = roomLedger()
    expect(within(panel).getByText(/Assigned purpose:/i)).toBeInTheDocument()
    expect(within(panel).getByText(/keeps one active rumor from cooling as quickly/i)).toBeInTheDocument()
  })
})

describe('HouseScreen — ward list', () => {
  it('shows no household section when ward list is empty', () => {
    renderHouseScreen()
    expect(screen.queryByRole('heading', { name: 'Household' })).toBeNull()
  })
})

describe('HouseScreen — household policy', () => {
  it('shows current pairing policy and lets the player change it from the house screen', async () => {
    const user = userEvent.setup()
    const store = renderHouseScreen()

    expect(screen.getByRole('heading', { name: 'Household Policy' })).toBeInTheDocument()
    expect(screen.getByText(/The house does not intervene in personal bonds/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Require professional distance' }))

    expect(store.getState().game.house.npcPairingPolicy).toBe('forbidden')
    expect(screen.getByText(/The house requires professional distance between its members/i)).toBeInTheDocument()
  })
})

describe('HouseScreen — domestic aftermath', () => {
  it('shows the latest household relationship beat directly on the house screen', () => {
    renderHouseScreen({
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        lastDomesticRelationshipBeat: {
          day: 4,
          npcIds: ['npc-marion-vale', 'npc-sanna-veld'],
          npcNames: ['Marion Vale', 'Sanna Veld'],
          roomId: 'room-quarters',
          roomName: 'Quarters',
          policy: 'open',
          intimacyStage: 'attachment',
          summary: 'Sharing Quarters gives Marion Vale and Sanna Veld private ground to become more than field partners. The house begins to read them as a pair.',
          effects: ['Trust +3 each', 'Affinity +2 each', 'Loyalty +1 each'],
          triggerType: 'quarters',
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'Domestic Aftermath' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Domestic Aftermath' }).closest('section')).toHaveTextContent('Marion Vale and Sanna Veld')
    expect(screen.getByText(/Policy frame:/i)).toBeInTheDocument()
    expect(screen.getByText(/The house does not intervene in personal bonds/i)).toBeInTheDocument()
    expect(screen.getByText(/Sharing Quarters gives Marion Vale and Sanna Veld private ground/i)).toBeInTheDocument()
    expect(screen.getByText('Trust +3 each')).toBeInTheDocument()
  })
})

describe('HouseScreen — room occupancy', () => {
  it('starts with Marion assigned to the quarters', async () => {
    const user = userEvent.setup()
    renderHouseScreen()

    await selectRoomOnPlan(user, /^Quarters —/)
    const panel = roomLedger()
    expect(within(panel).getByText(/Quartered here: Marion Vale/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Any housed resident can recover here between assignments/i)).toBeInTheDocument()
  })

  it('lets the player quarter a roster NPC from the room ledger and shows the name on the plan', async () => {
    const user = userEvent.setup()
    const readyHouseState = {
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        rooms: initialGameStateSnapshot.house.rooms.map((room) =>
          room.roomId === 'room-bureau'
            ? { ...room, state: 'intact' as const, repairCost: 0 }
            : room,
        ),
      },
    }
    const store = renderHouseScreen(readyHouseState)

    await selectRoomOnPlan(user, /^Bureau —/)
    await user.selectOptions(
      within(roomLedger()).getByRole('combobox', { name: 'Assign an occupant to Bureau' }),
      'npc-marion-vale',
    )

    expect(store.getState().game.npcRuntimeStates.find((npc) => npc.npcId === 'npc-marion-vale')?.roomAssignment).toBe('room-bureau')
    expect(within(roomLedger()).getByText(/Quartered here: Marion Vale/i)).toBeInTheDocument()
    // The plan writes the occupant into the room
    expect(screen.getAllByText(/Marion Vale/).length).toBeGreaterThanOrEqual(2)
  })
})

describe('HouseScreen — house improvements (destiny-h8hz)', () => {
  it('shows zeroed improvements and an empty-state message with no modules installed', () => {
    renderHouseScreen()
    expect(screen.getByRole('heading', { name: 'House Improvements' })).toBeInTheDocument()
    expect(screen.getByText('Water Quality:')).toBeInTheDocument()
    expect(screen.getByText(/No household modules installed yet\./i)).toBeInTheDocument()
  })

  it('lists an installed module with its resolved name and effect breakdown', () => {
    renderHouseScreen({
      ...initialGameStateSnapshot,
      installedHouseModules: [{ moduleItemId: 'item-module-water-purifier', installedAtDay: 3 }],
      houseImprovements: { waterQuality: 2, herbSupply: 0, entrySecurity: 0 },
      sleepQualityBonus: 10,
    })

    expect(screen.getByText('Clay-Char Water Purifier Stack')).toBeInTheDocument()
    expect(screen.getByText('Water Quality +2')).toBeInTheDocument()
    expect(screen.getByText('Sleep Quality +10')).toBeInTheDocument()
  })
})

describe('HouseScreen — unlocked actions (destiny-vyr6)', () => {
  it('shows the empty-state message when no actions have been unlocked', () => {
    renderHouseScreen()
    expect(screen.getByRole('heading', { name: 'Unlocked Actions' })).toBeInTheDocument()
    expect(screen.getByText(/No documents have unlocked an action yet\./i)).toBeInTheDocument()
  })

  it('lists an unlocked action with its label, granting document, and context', () => {
    renderHouseScreen({
      ...initialGameStateSnapshot,
      enabledActions: ['review-house-accounts'],
    })

    expect(screen.getByText('Review House Accounts')).toBeInTheDocument()
    expect(screen.getByText('House Debt Ledger')).toBeInTheDocument()
    expect(screen.getByText(/Your working house ledger/i)).toBeInTheDocument()
  })
})

describe('HouseScreen — evidence filed (destiny-23qg)', () => {
  it('shows the empty-state message when no evidence has been filed', () => {
    renderHouseScreen()
    expect(screen.getByRole('heading', { name: 'Evidence Filed' })).toBeInTheDocument()
    expect(screen.getByText(/No evidence has been filed, presented, or burned yet\./i)).toBeInTheDocument()
  })

  it('lists filed evidence with its item name and disposition badge', () => {
    renderHouseScreen({
      ...initialGameStateSnapshot,
      evidenceInventory: [
        { instanceId: 'inst-1', itemId: 'item-tally-debt-instrument', disposition: 'filed' },
        { instanceId: 'inst-2', itemId: 'item-papers-false-citizen', disposition: 'burned' },
      ],
    })

    expect(screen.getByText('Debt Instrument (Tally, Bearer-Payable)')).toBeInTheDocument()
    expect(screen.getByText('False Citizen Papers (Compact Seal Forgery)')).toBeInTheDocument()
    expect(screen.getByText('filed')).toBeInTheDocument()
    expect(screen.getByText('burned')).toBeInTheDocument()
  })
})
