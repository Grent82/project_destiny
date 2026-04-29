import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
})
