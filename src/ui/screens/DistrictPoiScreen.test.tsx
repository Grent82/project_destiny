import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { DistrictPoiScreen } from './DistrictPoiScreen'

function renderPoi(districtId: string, poiId: string) {
  const store = createGameStore({
    ...initialGameStateSnapshot,
    currentDistrictId: districtId,
  })
  render(
    <AppProviders store={store}>
      <MemoryRouter initialEntries={[`/district/${districtId}/poi/${poiId}`]}>
        <Routes>
          <Route path="/district/:districtId/poi/:poiId" element={<DistrictPoiScreen />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('DistrictPoiScreen', () => {
  it('renders the POI name as heading', () => {
    renderPoi('district-harbor', 'poi-harbor-guild-hall')
    expect(screen.getByRole('heading', { name: 'Harbor Guild Hall' })).toBeInTheDocument()
  })

  it('shows the district breadcrumb', () => {
    renderPoi('district-harbor', 'poi-harbor-guild-hall')
    expect(screen.getByText(/Harbor Ward/i)).toBeInTheDocument()
  })

  it('shows what the POI offers section', () => {
    renderPoi('district-harbor', 'poi-harbor-guild-hall')
    expect(screen.getByText(/What this place offers/i)).toBeInTheDocument()
  })

  it('renders the Berth tavern POI', () => {
    renderPoi('district-harbor', 'poi-harbor-the-berth')
    expect(screen.getByRole('heading', { name: 'The Berth' })).toBeInTheDocument()
  })
})
