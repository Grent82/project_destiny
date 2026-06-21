import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { initialStateWithIda } from '../../application/commands/testFixtures'
import { AppProviders } from '../app/AppProviders'
import { BrokerageScreen } from './BrokerageScreen'

function withKitchenState(state = initialGameStateSnapshot, roomState: 'intact' | 'damaged') {
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

function stateWithBrokerageActivity() {
  return withKitchenState(
    {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) => {
        if (npc.npcId === 'npc-marion-vale') {
          return {
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
              bondStartDay: 0,
            },
          }
        }

        if (npc.npcId === 'npc-ida-rhys') {
          return {
            ...npc,
            assignment: 'transferred' as const,
            bondStatus: {
              holderId: 'buyer-compact-registrar',
              contractValue: 90,
              termDays: 60,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: null,
              marketValue: 120,
              ownerType: 'npc' as const,
              bondStartDay: 0,
            },
          }
        }

        return npc
      }),
      bondedPersonsRegistry: {
        'buyer-compact-registrar': ['npc-ida-rhys'],
      },
    },
    'intact',
  )
}

function renderBrokerageScreen(state = stateWithBrokerageActivity()) {
  const store = createGameStore(state)

  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <BrokerageScreen />
      </MemoryRouter>
    </AppProviders>,
  )

  return store
}

describe('BrokerageScreen', () => {
  it('shows active house-held and transferred bond cases with operational actions', () => {
    renderBrokerageScreen()

    expect(screen.getByRole('heading', { name: 'Labor Brokerage' })).toBeInTheDocument()
    const intakeSection = screen
      .getByRole('heading', { name: 'Available intake' })
      .closest('.muster-section') as HTMLElement | null
    const houseHeldSection = screen
      .getByRole('heading', { name: 'House-held contracts' })
      .closest('.muster-section') as HTMLElement | null
    const transferredSection = screen
      .getByRole('heading', { name: 'Transferred away' })
      .closest('article') as HTMLElement | null

    expect(intakeSection).not.toBeNull()
    expect(houseHeldSection).not.toBeNull()
    expect(transferredSection).not.toBeNull()

    expect(within(intakeSection!).getByText(/Ida Rhys/i)).toBeInTheDocument()
    expect(within(intakeSection!).getAllByRole('button', { name: 'Take under debt contract' }).length).toBeGreaterThan(0)
    expect(within(houseHeldSection!).getByText(/Marion Vale/i)).toBeInTheDocument()
    expect(
      within(houseHeldSection!).getByRole('button', { name: 'Place in food service' }),
    ).toBeInTheDocument()
    expect(
      within(houseHeldSection!).getByRole('button', { name: 'Offer for transfer' }),
    ).toBeInTheDocument()
    expect(within(transferredSection!).getByText(/Ida Rhys/i)).toBeInTheDocument()
    expect(
      within(transferredSection!).getByRole('button', { name: 'Buy freedom' }),
    ).toBeInTheDocument()
  })

  it('lets the player place a house-held bonded NPC into food service from the brokerage surface', async () => {
    const user = userEvent.setup()
    const store = renderBrokerageScreen()

    await user.click(screen.getByRole('button', { name: 'Place in food service' }))

    const marion = store.getState().game.roster.find((npc) => npc.npcId === 'npc-marion-vale')
    expect(marion?.assignment).toBe('working')
    expect(marion?.roomAssignment).toBe('room-kitchen')
    expect(screen.getByRole('button', { name: 'Remove from food service' })).toBeInTheDocument()
  })

  it('shows an explicit refusal stance when the house is not operating bonded labor', () => {
    renderBrokerageScreen(
      withKitchenState(
        {
          ...initialGameStateSnapshot,
          availableForHire: [],
          roster: initialGameStateSnapshot.roster.map((npc) => ({
            ...npc,
            bondStatus: null,
          })),
        },
        'intact',
      ),
    )

    expect(screen.getByText(/The house is not currently running bound placements/i)).toBeInTheDocument()
    expect(screen.getByText(/Food output is resting on free or waged hands/i)).toBeInTheDocument()
  })

  it('can take an available intake offer into a player-held debt contract', async () => {
    const user = userEvent.setup()
    const store = renderBrokerageScreen({
      ...withKitchenState(initialGameStateSnapshot, 'intact'),
      currentDistrictId: 'district-the-pale',
      availableForHire: [
        {
          npcId: 'npc-ida-rhys',
          discoveredInDistrictId: 'district-the-pale',
          wagePerDay: 8,
          signingBonus: 0,
          requiredFactionId: null,
          requiredFactionStanding: 0,
          turnsAvailable: 10,
          source: 'district',
        },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Take under debt contract' }))

    const ida = store.getState().game.roster.find((npc) => npc.npcId === 'npc-ida-rhys')
    expect(ida?.bondStatus?.ownerType).toBe('player')
    expect(ida?.bondStatus?.entryReason).toBe('debt-settlement')
    expect(store.getState().game.availableForHire).toHaveLength(0)
  })

  it('shows buyer quotes and allows direct transfer once a contract is marked for sale', async () => {
    const user = userEvent.setup()
    const store = renderBrokerageScreen({
      ...stateWithBrokerageActivity(),
      money: 100,
      roster: stateWithBrokerageActivity().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' && npc.bondStatus
          ? {
              ...npc,
              bondStatus: { ...npc.bondStatus, forSale: true, marketValue: 120 },
            }
          : npc,
      ),
    })

    expect(screen.getByText(/Buyer quotes/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Transfer to Noble House Agent (126 Marks)' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Transfer to Noble House Agent (126 Marks)' }))

    expect(store.getState().game.money).toBe(226)
    const marion = store.getState().game.roster.find((npc) => npc.npcId === 'npc-marion-vale')
    expect(marion?.assignment).toBe('transferred')
    expect(marion?.bondStatus?.ownerType).toBe('npc')
    expect(screen.getByText(/held by Noble House Agent/i)).toBeInTheDocument()
  })

  it('surfaces the ongoing moral and civic pressure of bonded labor', () => {
    renderBrokerageScreen({
      ...stateWithBrokerageActivity(),
      roster: stateWithBrokerageActivity().roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              assignment: 'working' as const,
              roomAssignment: 'room-kitchen',
              bondStatus: npc.bondStatus
                ? { ...npc.bondStatus, alongsideFreeAssignmentDays: 6 }
                : npc.bondStatus,
            }
          : npc.npcId === 'npc-ida-rhys'
            ? { ...npc, assignment: 'working' as const, bondStatus: null }
            : npc,
      ),
    })

    expect(screen.getByRole('heading', { name: 'Operational pressure' })).toBeInTheDocument()
    expect(screen.getByText(/1 coercive contract under the house/i)).toBeInTheDocument()
    expect(screen.getByText(/Equal-work notice in about 8 days/i)).toBeInTheDocument()
    expect(screen.getByText(/Every 28 days: corruption \+2, prosperity -1, unrest \+1/i)).toBeInTheDocument()
  })
})
