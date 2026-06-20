import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: 'House-held contracts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transferred away' })).toBeInTheDocument()
    expect(screen.getByText(/Marion Vale/i)).toBeInTheDocument()
    expect(screen.getByText(/Ida Rhys/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place in food service' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Offer for transfer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy freedom' })).toBeInTheDocument()
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
})
