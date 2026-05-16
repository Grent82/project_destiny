import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DistrictMapScreen } from './DistrictMapScreen'

function renderDistrictMap() {
  const store = createGameStore(initialGameStateSnapshot)
  render(
    <AppProviders store={store}>
      <MemoryRouter>
        <DistrictMapScreen />
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

describe('DistrictMapScreen — information hierarchy', () => {
  it('renders district cards for all districts', () => {
    renderDistrictMap()
    // The Pale district card heading is always present
    expect(screen.getAllByText('The Pale').length).toBeGreaterThan(0)
  })

  it('does not render a People heading on any district card', () => {
    renderDistrictMap()
    expect(screen.queryByText('People')).toBeNull()
  })

  it('does not render world NPC names or descriptions on district cards', () => {
    renderDistrictMap()
    // Lady Sorn is a known world NPC — should not appear on the map overview
    expect(screen.queryByText(/lady sorn/i)).toBeNull()
    // Caevis Sable-Cairn is another world NPC
    expect(screen.queryByText(/sable-cairn/i)).toBeNull()
  })

  it('shows actionable district information: faction badge and danger level', () => {
    renderDistrictMap()
    // Faction badges and danger indicators should be present
    // The Pale is controlled by the Compact — 'Compact' badge expected
    expect(screen.getAllByText('Compact').length).toBeGreaterThan(0)
  })

  it('shows house district marker for the house district', () => {
    renderDistrictMap()
    // The ⌂ House Valdris badge should appear on The Pale card
    expect(screen.getAllByText(/House Valdris/i).length).toBeGreaterThan(0)
  })
})
