import { render, screen, within } from '@testing-library/react'
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

  it('labels Civic Compact (standing +10) as Neutral, matching LedgerScreen (destiny-09wr)', () => {
    renderFactions()
    const compactCard = screen.getByText(/Civic Compact/i).closest('article')!
    expect(within(compactCard).getByText(/Neutral/)).toBeInTheDocument()
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

  it('tells the day-one political truth about House Valdris footing', () => {
    renderFactions()

    expect(screen.getByRole('heading', { name: 'House Political Footing' })).toBeInTheDocument()
    expect(screen.getByText('Restored ward seats')).toBeInTheDocument()
    expect(screen.getByText('Sponsor channels')).toBeInTheDocument()
    expect(
      screen.getByText(/currently holds no restored ward seat and no sponsor channel into the chamber/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/once held three ward seats before the debt proceedings stripped them/i),
    ).toBeInTheDocument()
  })
})
