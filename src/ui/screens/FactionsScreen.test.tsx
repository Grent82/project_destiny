import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { FactionsScreen } from './FactionsScreen'

function renderFactions(state = initialGameStateSnapshot) {
  const store = createGameStore(state)
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <FactionsScreen />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
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

describe('FactionsScreen — visual standing bars (destiny-pjby)', () => {
  it('shows a signed numeric standing value for every faction (+10 and -65 in the default state)', () => {
    renderFactions()
    expect(screen.getByText('+10')).toBeInTheDocument() // Civic Compact
    expect(screen.getByText('-65')).toBeInTheDocument() // Gilded Court
  })

  it('renders a 5-segment standing bar with a dot for each faction card', () => {
    renderFactions()
    const bars = screen.getAllByRole('img', { name: /^Standing/ })
    expect(bars.length).toBe(6) // one per faction in contentCatalog.factions
    for (const bar of bars) {
      expect(bar.querySelectorAll('.standing-bar__segment').length).toBe(5)
      expect(bar.querySelector('.standing-bar__dot')).toBeInTheDocument()
    }
  })

  it('shows a legend explaining all 5 tiers once, above the faction cards', () => {
    renderFactions()
    const legend = screen.getByRole('group', { name: 'Faction standing legend' })
    expect(within(legend).getByText('Hostile')).toBeInTheDocument()
    expect(within(legend).getByText('Cold')).toBeInTheDocument()
    expect(within(legend).getByText('Neutral')).toBeInTheDocument()
    expect(within(legend).getByText('Warm')).toBeInTheDocument()
    expect(within(legend).getByText('Allied')).toBeInTheDocument()
  })

  it('shows no blacklist icon when no faction is institutionally blacklisted', () => {
    renderFactions()
    expect(screen.queryByText('⛔')).toBeNull()
  })

  it('shows a blacklist icon with an explanatory tooltip when a faction is institutionally blacklisted', () => {
    renderFactions({
      ...initialGameStateSnapshot,
      institutionalStanding: {
        ...initialGameStateSnapshot.institutionalStanding,
        'faction-gilded-court': 'blacklisted',
      },
    })
    const icon = screen.getByText('⛔')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('title', expect.stringContaining('Blacklisted by Gilded Court — shops closed'))
  })
})
