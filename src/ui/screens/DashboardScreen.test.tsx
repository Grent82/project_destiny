import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'

import {
  createGameStore,
  gameActions,
  type SaveGameStore,
} from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import type { GameState } from '../../domain'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { AppProviders } from '../app/AppProviders'
import { DashboardScreen } from './DashboardScreen'

function createMemorySaveStore(): SaveGameStore {
  let snapshot: GameState | null = null

  return {
    load() {
      return snapshot
    },
    save(state) {
      snapshot = state
    },
    clear() {
      snapshot = null
    },
  }
}

function makeHouseKitchenIntact() {
  return {
    ...initialGameStateSnapshot.house,
    rooms: initialGameStateSnapshot.house.rooms.map((room) =>
      room.roomId === 'room-kitchen' ? { ...room, state: 'intact' as const } : room,
    ),
  }
}

describe('DashboardScreen', () => {
  it('does not emit unstable selector warnings on dashboard render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <AppProviders store={createGameStore(initialGameStateSnapshot)}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    const unstableWarnings = warn.mock.calls.filter(([message]) =>
      typeof message === 'string' &&
      message.includes('returned a different result when called with the same parameters'),
    )

    expect(unstableWarnings).toHaveLength(0)
    warn.mockRestore()
  })

  it('surfaces a clear recommended next quest action in overview', () => {
    const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected harborwatch quest in test fixtures.')
    }

    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-pale',
      activeQuests: [createQuestRuntime(harborwatch, 1)],
      availableQuestLeads: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'What next' })).toBeInTheDocument()
    expect(screen.getByText('Travel to The Warrens')).toBeInTheDocument()
    expect(screen.getByText('Awaiting conditions')).toBeInTheDocument()
    expect(screen.getByText('100 Mk')).toBeInTheDocument()
    expect(screen.getByText(/Claimant:/i)).toBeInTheDocument()
    expect(screen.getByText(/Enforced by:/i)).toBeInTheDocument()
    expect(screen.getByText(/Beneficiary:/i)).toBeInTheDocument()
    expect(screen.getByText(/Harlen Voss/i)).toBeInTheDocument()
    expect(screen.getByText(/Gilded Court/i)).toBeInTheDocument()
  })

  it('keeps load disabled until a snapshot exists', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const saveStore = createMemorySaveStore()

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DashboardScreen saveStore={saveStore} />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    expect(screen.getByRole('button', { name: 'Load session' })).toBeDisabled()
    expect(
      screen.getByText('Loading replaces the current in-memory session.'),
    ).toBeInTheDocument()
  })

  it('saves and restores the current session through the UI controls', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      money: 500,
      currentDistrictId: 'district-harbor',
    })
    const saveStore = createMemorySaveStore()

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DashboardScreen saveStore={saveStore} />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Operations' }))
    await user.click(screen.getByRole('button', { name: 'Save session' }))

    expect(screen.getByRole('button', { name: 'Load session' })).toBeEnabled()

    act(() => {
      store.dispatch(
        gameActions.purchaseItemFromShop({
          shopId: 'shop-harbor-provisions',
          itemId: 'item-medkit-field',
        }),
      )
    })

    await user.click(screen.getByRole('tab', { name: 'Intelligence' }))
    expect(screen.getByText(/Purchased Field Medkit from Harbor Provisions for \d+ Marks\./i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Operations' }))
    await user.click(screen.getByRole('button', { name: 'Load session' }))

    expect(screen.getByText('Session restored from local snapshot.')).toBeInTheDocument()
  })

  it('does not show non-diegetic management shortcuts in overview', () => {
    render(
      <AppProviders store={createGameStore(initialGameStateSnapshot)}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.queryByRole('heading', { name: 'Quick Routes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Visit local shops/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Open the ledger/i })).not.toBeInTheDocument()
  })

  it('surfaces an economy brief with reserves, pressure, and next levers in operations', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 350,
        foodCapacity: 1000,
        corridorStatus: 'disrupted',
        corridorClearanceProgressDays: 1,
      },
      roster: initialGameStateSnapshot.roster.slice(0, 2),
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    expect(screen.getByRole('heading', { name: 'City Resources' })).toBeInTheDocument()
    expect(screen.getByText('350 / 1000 stores')).toBeInTheDocument()
    expect(screen.getByText('35% security')).toBeInTheDocument()
    expect(screen.getByText('Daily demand')).toBeInTheDocument()
    expect(screen.getByText('601 rations')).toBeInTheDocument()
    expect(screen.getByText('Local output')).toBeInTheDocument()
    expect(screen.getByText('102 rations/day')).toBeInTheDocument()
    expect(screen.getByText('Corridor imports')).toBeInTheDocument()
    expect(screen.getByText('150 rations/day')).toBeInTheDocument()
    expect(screen.getByText('Market read')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check available work' })).toHaveAttribute('href', '/contracts')
    expect(screen.getByRole('link', { name: 'Review ward prices' })).toHaveAttribute('href', '/shops')
    expect(screen.getByRole('link', { name: 'Review labor brokerage' })).toHaveAttribute('href', '/brokerage')
  })

  it('surfaces bonded kitchen service when the house is using bound food labor', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      house: makeHouseKitchenIntact(),
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              assignment: 'working' as const,
              roomAssignment: 'room-kitchen',
              bondStatus: {
                holderId: 'player',
                contractValue: 55,
                termDays: 20,
                entryReason: 'voluntary' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 140,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : npc,
      ),
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('tab', { name: 'Operations' }))

    expect(screen.getByText('Bonded kitchen service')).toBeInTheDocument()
    expect(screen.getByText('1 hand · +6 rations/day')).toBeInTheDocument()
    expect(screen.getByText('126 rations/day')).toBeInTheDocument()
  })

  it('Work Board CTA uses router navigation without hard-reloading', async () => {
    const user = userEvent.setup()

    function LocationProbe() {
      const loc = useLocation()
      return <div data-testid="route">{loc.pathname}</div>
    }

    render(
      <AppProviders store={createGameStore({ ...initialGameStateSnapshot, isFirstRun: true })}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardScreen saveStore={createMemorySaveStore()} />} />
            <Route path="/district/district-the-pale" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: '→ Visit the Pale' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/district/district-the-pale')
  })

  it('renders without errors with high money value', () => {
    render(
      <AppProviders store={createGameStore({ ...initialGameStateSnapshot, money: 5000000 })}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Lord Valdris/i })).toBeInTheDocument()
  })

  it('renders without errors with custom city dials', () => {
    render(
      <AppProviders store={createGameStore({
        ...initialGameStateSnapshot,
        cityDials: { control: 45, prosperity: 60, unrest: 30, corruption: 25 },
      })}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Lord Valdris/i })).toBeInTheDocument()
  })

  it('renders without errors with custom faction standings', () => {
    render(
      <AppProviders store={createGameStore({
        ...initialGameStateSnapshot,
        factionStandings: {
          ...initialGameStateSnapshot.factionStandings,
          'faction-civic-compact': 25,
          'faction-gilded-court': -10,
        },
      })}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Lord Valdris/i })).toBeInTheDocument()
  })

  it('renders without errors with activity log entries', () => {
    render(
      <AppProviders store={createGameStore({
        ...initialGameStateSnapshot,
        activityLog: [
          { id: 'log-1', day: 1, timeSlot: 'morning', category: 'system' as const, message: 'Test activity entry' },
        ],
      })}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Lord Valdris/i })).toBeInTheDocument()
  })

  it('renders without errors when no active quests', () => {
    render(
      <AppProviders store={createGameStore({
        ...initialGameStateSnapshot,
        activeQuests: [],
        availableQuestLeads: [],
      })}>
        <MemoryRouter>
          <DashboardScreen saveStore={createMemorySaveStore()} />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Lord Valdris/i })).toBeInTheDocument()
  })
})
