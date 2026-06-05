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

describe('HouseScreen — search result lifecycle', () => {
  it('shows full discovery payload immediately after searching (fresh state)', async () => {
    const user = userEvent.setup()
    renderHouseScreen()

    const bureauCard = screen.getByRole('heading', { name: 'Bureau' }).closest('article')!
    await user.click(within(bureauCard).getByRole('button', { name: 'Search' }))

    // Confirm the search in the confirmation modal
    const confirmButton = screen.getByRole('button', { name: /Search room/i })
    await user.click(confirmButton)

    // Full discovery message visible in fresh state
    expect(within(bureauCard).getByText(/A forgotten strongbox behind the panelling/i)).toBeInTheDocument()
    // Flavor finds visible in fresh state
    expect(within(bureauCard).getByText(/22 Marks in pre-Breach reserve coin/i)).toBeInTheDocument()
    // Actionable find visible in fresh state
    expect(within(bureauCard).getByText(/Removal chit proving two house ledgers were taken during the seizure/i)).toBeInTheDocument()
  })

  it('collapses to compact state for a room that was already searched on load', () => {
    // Pre-search the bureau in initial state
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

    const bureauCard = screen.getByText('Bureau').closest('article')!

    // Compact "Searched" mark is present
    expect(within(bureauCard).getByText('✓ Searched')).toBeInTheDocument()

    // Full discovery message is NOT shown in compact/archived state
    expect(within(bureauCard).queryByText(/A forgotten strongbox behind the panelling/i)).toBeNull()
    // Flavor finds are NOT shown
    expect(within(bureauCard).queryByText(/22 Marks in pre-Breach reserve coin/i)).toBeNull()

    // Actionable find IS shown (persistent — still needs resolution)
    expect(within(bureauCard).getByText(/Removal chit proving two house ledgers were taken during the seizure/i)).toBeInTheDocument()
    // Follow-up guidance IS shown
    expect(within(bureauCard).getByText(/Show the removal chit to Marion/i)).toBeInTheDocument()
  })

  it('shows compact searched state for a room with no unresolved leads', () => {
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

    const kitchenCard = screen.getByText('Kitchen').closest('article')!
    expect(within(kitchenCard).getByText('✓ Searched')).toBeInTheDocument()
    // Kitchen has no actionableFinds — just a simple searched state
    expect(within(kitchenCard).queryByText(/survivors cache/i)).toBeNull()
  })
})

describe('HouseScreen — repair outcomes', () => {
  it('shows explicit payoff statement before repairing bureau', () => {
    renderHouseScreen()
    const bureauCard = screen.getByText('Bureau').closest('article')!
    // Bureau copy explains what repair unlocks before the player pays
    expect(within(bureauCard).getByText(/working accounts office/i)).toBeInTheDocument()
    expect(within(bureauCard).getByText(/Repair to track debts/i)).toBeInTheDocument()
  })

  it('shows post-repair follow-up link for bureau after repair', async () => {
    const user = userEvent.setup()
    // Give player enough money to afford bureau repair (15 Mk)
    const richState = { ...initialGameStateSnapshot, money: 100 }
    const store = renderHouseScreen(richState)

    const bureauCard = screen.getByText('Bureau').closest('article')!
    await user.click(within(bureauCard).getByRole('button', { name: /Repair/i }))

    expect(within(bureauCard).getByText(/Repairs underway/i)).toBeInTheDocument()

    act(() => {
      store.dispatch(gameActions.endDay())
      store.dispatch(gameActions.endDay())
      store.dispatch(gameActions.endDay())
    })

    // After the timer completes: post-repair follow-up link visible
    const repairedBureauCard = screen.getByRole('heading', { name: 'Bureau' }).closest('article')!
    expect(within(repairedBureauCard).getByText(/Accounts are in order/i)).toBeInTheDocument()
    expect(within(repairedBureauCard).getByRole('link', { name: /View House Accounts/i })).toBeInTheDocument()
  })

  it('shows explicit payoff for kitchen before repair', () => {
    renderHouseScreen()
    const kitchenCard = screen.getByText('Kitchen').closest('article')!
    expect(within(kitchenCard).getByText(/daily wage drops by 1 Mark/i)).toBeInTheDocument()
  })

  it('shows explicit payoff for master chamber before repair', () => {
    renderHouseScreen()
    const chamberCard = screen.getByText("Master's Chamber").closest('article') ??
      screen.getByText(/master/i, { selector: 'h3' }).closest('article')!
    expect(chamberCard).toBeTruthy()
    const effectText = chamberCard!.textContent ?? ''
    expect(effectText).toMatch(/faction contacts/i)
  })

  it('shows assigned room function effect summaries when a purpose is set', () => {
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

    const bureauCard = screen.getByRole('heading', { name: 'Bureau' }).closest('article')!
    expect(within(bureauCard).getByText(/Assigned purpose:/i)).toBeInTheDocument()
    expect(within(bureauCard).getByText(/keeps one active rumor from cooling as quickly/i)).toBeInTheDocument()
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
  it('starts with Marion assigned to the quarters', () => {
    renderHouseScreen()

    const marionRoomCard = screen.getByRole('heading', { name: 'Quarters' }).closest('article')!
    expect(within(marionRoomCard).getByText('Marion Vale')).toBeInTheDocument()
    expect(within(marionRoomCard).getByText(/Any housed resident can recover here between assignments/i)).toBeInTheDocument()
  })

  it('lets the player assign a roster NPC to a room and shows the occupant on the room card', async () => {
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

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Assign Marion Vale to room' }),
      'room-bureau',
    )

    expect(store.getState().game.roster.find((npc) => npc.npcId === 'npc-marion-vale')?.roomAssignment).toBe('room-bureau')

    const bureauCard = screen.getByRole('heading', { name: 'Bureau' }).closest('article')!
    expect(within(bureauCard).getByText('Marion Vale')).toBeInTheDocument()
  })
})
