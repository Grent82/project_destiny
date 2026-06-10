import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DistrictInteriorScreen } from './DistrictInteriorScreen'

function PoiProbe() {
  return <p>poi probe screen</p>
}

function renderInterior(districtId: string, currentDistrictId: string | null) {
  const store = createGameStore({
    ...initialGameStateSnapshot,
    currentDistrictId,
  })
  render(
    <AppProviders store={store}>
      <MemoryRouter initialEntries={[`/district/${districtId}`]}>
        <Routes>
          <Route path="/district/:districtId" element={<DistrictInteriorScreen />} />
          <Route path="/district/:districtId/poi/:poiId" element={<PoiProbe />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
  return store
}

describe('DistrictInteriorScreen — district map', () => {
  it('renders the district map plate with every POI of the district', () => {
    renderInterior('district-the-pale', 'district-the-pale')
    expect(screen.getByRole('figure', { name: 'Map of The Pale' })).toBeInTheDocument()
    // POI names appear on the map and in the location cards
    expect(screen.getAllByText('House Valdric').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Tallow Ring Den').length).toBeGreaterThanOrEqual(2)
  })

  it('shows NPCs present in the district on the map plate', () => {
    renderInterior('district-the-pale', 'district-the-pale')
    // Garet Doyle and Sister Vael are scheduled in The Pale in the morning slot
    expect(screen.getByText(/seen here:.*Garet Doyle/)).toBeInTheDocument()
  })

  it('navigates to the POI screen when a map node is clicked while present', async () => {
    const user = userEvent.setup()
    renderInterior('district-the-pale', 'district-the-pale')
    await user.click(screen.getByRole('button', { name: 'House Valdric' }))
    expect(screen.getByText('poi probe screen')).toBeInTheDocument()
  })

  it('does not navigate from map nodes when the player is elsewhere', async () => {
    const user = userEvent.setup()
    renderInterior('district-the-pale', 'district-harbor')
    await user.click(
      screen.getByRole('button', { name: /House Valdric — enter the district to approach/i }),
    )
    expect(screen.queryByText('poi probe screen')).toBeNull()
  })
})
