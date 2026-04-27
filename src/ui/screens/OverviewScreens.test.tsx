import { render, screen } from '@testing-library/react'

import { AppProviders } from '../app/AppProviders'
import { DistrictsScreen } from './DistrictsScreen'
import { FactionsScreen } from './FactionsScreen'

describe('overview screens', () => {
  it('renders seeded district overview entries', () => {
    render(
      <AppProviders>
        <DistrictsScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Districts' })).toBeInTheDocument()
    expect(screen.getByText('Harbor Ward')).toBeInTheDocument()
    expect(screen.getByText(/Civic Compact/i)).toBeInTheDocument()
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
