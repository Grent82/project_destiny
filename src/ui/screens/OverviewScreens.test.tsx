import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DistrictMapScreen } from './DistrictMapScreen'
import { FactionsScreen } from './FactionsScreen'

describe('overview screens', () => {
  it('renders seeded district map entries', () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <DistrictMapScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'The City' })).toBeInTheDocument()
    expect(screen.getAllByText('Harbor Ward').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Compact').length).toBeGreaterThan(0)
  })

  it('renders seeded faction overview entries', () => {
    render(
      <AppProviders>
        <FactionsScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Factions' })).toBeInTheDocument()
    expect(screen.getByText('Gilded Court')).toBeInTheDocument()
    expect(screen.getByText(/Expand elite influence/i)).toBeInTheDocument()
  })

  it('distinguishes restored seats from sponsor access in council presentation', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        renown: 120,
      },
      councilSeats: {},
    })

    render(
      <AppProviders store={store}>
        <FactionsScreen />
      </AppProviders>,
    )

    expect(screen.getByText(/House Valdris once held three ward seats/i)).toBeInTheDocument()
    expect(screen.getByText(/Restored ward seats/i)).toBeInTheDocument()
    expect(screen.getByText(/Sponsor channels/i)).toBeInTheDocument()
    expect(screen.getByText(/holds no restored ward seat, but its name carries enough weight/i)).toBeInTheDocument()
    expect(screen.getByText(/Renown-based access to lobby, pressure, and steer a vote/i)).toBeInTheDocument()
  })
})
