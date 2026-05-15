import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { FactionsScreen } from './FactionsScreen'

function renderFactions() {
  const store = createGameStore(initialGameStateSnapshot)
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <FactionsScreen />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('FactionsScreen', () => {
  it('renders Factions heading', () => {
    renderFactions()
    expect(screen.getByRole('heading', { name: 'Factions' })).toBeInTheDocument()
  })

  it('shows city stability section', () => {
    renderFactions()
    expect(screen.getByText(/City Stability/i)).toBeInTheDocument()
  })

  it('shows institutional arm with council factions', () => {
    renderFactions()
    expect(screen.getByText(/The Institutional Arm/i)).toBeInTheDocument()
    expect(screen.getByText(/Civic Compact/i)).toBeInTheDocument()
  })

  it('shows standing tier for at least one faction', () => {
    renderFactions()
    const tiers = ['Hostile', 'Cold', 'Neutral', 'Warm', 'Allied']
    const found = tiers.some((tier) => screen.queryAllByText(tier).length > 0)
    expect(found).toBe(true)
  })

  it('shows city dials section', () => {
    renderFactions()
    expect(screen.getByRole('heading', { name: 'City Dials' })).toBeInTheDocument()
  })
})
