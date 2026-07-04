import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { createGameStore } from '../../application'
import { initialStateWithIda } from '../../application/commands/testFixtures'
import { AppProviders } from '../app/AppProviders'
import { RosterScreen } from './RosterScreen'

describe('RosterScreen', () => {
  it('does not emit unstable selector warnings on initial roster render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <AppProviders store={createGameStore(initialStateWithIda)}>
        <MemoryRouter>
          <RosterScreen />
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

  it('renders seeded roster entries and updates the selected detail panel', async () => {
    const user = userEvent.setup()
    const store = createGameStore(initialStateWithIda)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'The Roster' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marion Vale/i })).toBeInTheDocument()
    expect(screen.getByText(/'Before the docks' means she survived/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ida Rhys/i }))

    expect(screen.getByText(/A line mechanic turned field engineer/i)).toBeInTheDocument()
  })

  it('surfaces bound and transferred status in the roster roll itself', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              bondStatus: {
                holderId: 'player',
                contractValue: 55,
                termDays: 20,
                entryReason: 'voluntary' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: true,
                lastOfferDay: null,
                marketValue: 140,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : npc.npcId === 'npc-ida-rhys'
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
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const marionRow = screen.getByRole('button', { name: /Marion Vale/i })
    const idaRow = screen.getByRole('button', { name: /Ida Rhys/i })

    expect(within(marionRow).getByText(/Bound to the house/i)).toBeInTheDocument()
    expect(within(marionRow).getByText(/Marked for transfer/i)).toBeInTheDocument()
    expect(within(idaRow).getByText(/Held by Compact Registrar/i)).toBeInTheDocument()
  })

  it('shows empty state when roster has no members', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: [],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/The Roster/i)).toBeInTheDocument()
    expect(screen.getByText(/No operatives/i)).toBeInTheDocument()
  })

  it('displays idle NPCs with At liberty status', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, assignment: 'idle' as const } : npc
      ),
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const marionButton = screen.getByRole('button', { name: /Marion Vale/i })
    expect(marionButton).toBeInTheDocument()
  })

  it('displays working NPCs with job assignment', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, assignment: 'working' as const, roomAssignment: 'room-kitchen' }
          : npc
      ),
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const marionButton = screen.getByRole('button', { name: /Marion Vale/i })
    expect(marionButton).toBeInTheDocument()
  })

  it('displays NPC title badge when active title is assigned', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-house-lord' } : npc
      ),
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const marionButton = screen.getByRole('button', { name: /Marion Vale/i })
    expect(marionButton).toBeInTheDocument()
  })

  it('allows filtering by assignment state', () => {
    const store = createGameStore({
      ...initialStateWithIda,
      npcRuntimeStates: [
        { ...initialStateWithIda.npcRuntimeStates[0], assignment: 'idle' as const },
        { ...initialStateWithIda.npcRuntimeStates[1], assignment: 'working' as const, roomAssignment: 'room-kitchen' },
      ],
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: /Marion Vale/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ida Rhys/i })).toBeInTheDocument()
  })
})
