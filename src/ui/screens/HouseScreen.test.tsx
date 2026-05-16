import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
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

    const bureauCard = screen.getByText('Bureau').closest('article')!
    await user.click(within(bureauCard).getByRole('button', { name: 'Search' }))

    // Full discovery message visible in fresh state
    expect(within(bureauCard).getByText(/A forgotten strongbox behind the panelling/i)).toBeInTheDocument()
    // Flavor finds visible in fresh state
    expect(within(bureauCard).getByText(/22 Marks in pre-Breach reserve coin/i)).toBeInTheDocument()
    // Actionable find visible in fresh state
    expect(within(bureauCard).getByText(/two ledgers removed the night the house fell/i)).toBeInTheDocument()
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
    expect(within(bureauCard).getByText(/two ledgers removed the night the house fell/i)).toBeInTheDocument()
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
    renderHouseScreen(richState)

    const bureauCard = screen.getByText('Bureau').closest('article')!
    await user.click(within(bureauCard).getByRole('button', { name: /Repair/i }))

    // After repair: post-repair follow-up link visible
    expect(within(bureauCard).getByText(/Accounts are in order/i)).toBeInTheDocument()
    expect(within(bureauCard).getByRole('link', { name: /View House Accounts/i })).toBeInTheDocument()
  })

  it('shows explicit payoff for kitchen before repair', () => {
    renderHouseScreen()
    const kitchenCard = screen.getByText('Kitchen').closest('article')!
    expect(within(kitchenCard).getByText(/daily wage drops by 1 Mk/i)).toBeInTheDocument()
  })

  it('shows explicit payoff for master chamber before repair', () => {
    renderHouseScreen()
    const chamberCard = screen.getByText("Master's Chamber").closest('article') ??
      screen.getByText(/master/i, { selector: 'h3' }).closest('article')!
    expect(chamberCard).toBeTruthy()
    const effectText = chamberCard!.textContent ?? ''
    expect(effectText).toMatch(/faction contacts/i)
  })
})

describe('HouseScreen — ward list', () => {
  it('shows no household section when wards array is empty', () => {
    renderHouseScreen()
    expect(screen.queryByRole('heading', { name: 'Household' })).toBeNull()
  })

  it('shows ward name, stage, and origin when wards are present', () => {
    const stateWithWard = {
      ...initialGameStateSnapshot,
      wards: [
        {
          wardId: 'ward-test-1',
          name: 'Esa Thule',
          parentNpcId: null,
          parentNpcIds: ['player', 'npc-ida-rhys'],
          origin: 'rescued' as const,
          birthDay: 5,
          stage: 'child' as const,
          bondStatus: null,
          freedOnDay: null,
          promotedToNpcId: null,
        },
      ],
    }
    renderHouseScreen(stateWithWard)

    expect(screen.getByRole('heading', { name: 'Household' })).toBeInTheDocument()
    expect(screen.getByText('Esa Thule')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
    expect(screen.getByText('rescued')).toBeInTheDocument()
  })

  it('shows bond status when a ward is under bond', () => {
    const stateWithBondedWard = {
      ...initialGameStateSnapshot,
      wards: [
        {
          wardId: 'ward-test-2',
          name: 'Renn Holst',
          parentNpcId: null,
          parentNpcIds: [],
          origin: 'adopted' as const,
          birthDay: null,
          stage: 'teenager' as const,
          bondStatus: {
            holderId: 'faction-civic-compact',
            contractValue: 60,
            termDays: 90,
            entryReason: 'compact-assessment' as const,
            alongsideFreeAssignmentDays: 0,
            lastEqualityNoticeDay: null,
          },
          freedOnDay: null,
          promotedToNpcId: null,
        },
      ],
    }
    renderHouseScreen(stateWithBondedWard)

    expect(screen.getByText(/Bond held/i)).toBeInTheDocument()
    expect(screen.getByText(/faction-civic-compact/i)).toBeInTheDocument()
  })
})
