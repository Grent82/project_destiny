import { render, screen, within } from '@testing-library/react'
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

function placeLedger() {
  return screen.getByRole('complementary', { name: 'Place ledger' })
}

describe('DistrictInteriorScreen — district map and place ledger', () => {
  it('renders the district map plate with every POI of the district', () => {
    renderInterior('district-the-pale', 'district-the-pale')
    expect(screen.getByRole('figure', { name: 'Map of The Pale' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^House Valdris/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tallow Ring Den/ })).toBeInTheDocument()
  })

  it('introduces the folk about the ward in the ledger verso, not as bare names on the plate', () => {
    renderInterior('district-the-pale', 'district-the-pale')
    // The plate carries only a compact count; the ledger explains who these people are
    expect(screen.getByText(/\d+ about the ward/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'About the ward' })).toBeInTheDocument()
    const panel = placeLedger()
    // Garet Doyle is scheduled in The Pale in the morning slot, introduced with a note
    expect(within(panel).getByText('Garet Doyle')).toBeInTheDocument()
    expect(within(panel).getByText(/Folk move between wards as the day turns/i)).toBeInTheDocument()
  })

  it('explains the plate marks in a legend', () => {
    renderInterior('district-the-pale', 'district-the-pale')
    expect(screen.getByText(/work posted/i)).toBeInTheDocument()
    expect(screen.getByText(/people for hire/i)).toBeInTheDocument()
    expect(screen.getByText(/closed at this hour/i)).toBeInTheDocument()
  })

  it('selecting a place fills the ledger panel and Enter location navigates', async () => {
    const user = userEvent.setup()
    renderInterior('district-the-pale', 'district-the-pale')

    // Before selection, the panel invites pointing at the plate
    expect(within(placeLedger()).getByText(/Point at a place on the plate/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^House Valdris/ }))
    const panel = placeLedger()
    expect(within(panel).getByRole('heading', { name: 'House Valdris' })).toBeInTheDocument()
    expect(within(panel).getByText(/Your inherited house/i)).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Enter location' }))
    expect(screen.getByText('poi probe screen')).toBeInTheDocument()
  })

  it('offers no Enter action when the player is elsewhere, but the entry stays readable', async () => {
    const user = userEvent.setup()
    renderInterior('district-the-pale', 'district-harbor')

    await user.click(screen.getByRole('button', { name: /^House Valdris/ }))
    const panel = placeLedger()
    expect(within(panel).getByRole('heading', { name: 'House Valdris' })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Enter location' })).toBeNull()
    expect(within(panel).getByText(/Enter the district to approach this place/i)).toBeInTheDocument()
    expect(screen.queryByText('poi probe screen')).toBeNull()
  })

  it('marks places that keep no hours in the current slot as closed', async () => {
    const user = userEvent.setup()
    // The Hold keeps evening/night hours; the game starts in the morning
    renderInterior('district-harbor', 'district-the-pale')

    await user.click(screen.getByRole('button', { name: /^The Hold — closed at this hour/ }))
    const panel = placeLedger()
    expect(within(panel).getByText('Closed at this hour')).toBeInTheDocument()
    expect(within(panel).getByText(/Keeps hours: evening, night/i)).toBeInTheDocument()
  })
})
