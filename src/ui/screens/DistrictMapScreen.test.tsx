import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function districtLedger() {
  return screen.getByRole('complementary', { name: 'District ledger' })
}

describe('DistrictMapScreen — information hierarchy', () => {
  it('renders every district on the survey', () => {
    renderDistrictMap()
    expect(screen.getAllByText('The Pale').length).toBeGreaterThan(0)
    expect(screen.getAllByText('The Warrens').length).toBeGreaterThan(0)
  })

  it('does not render a People heading anywhere on the overview', () => {
    renderDistrictMap()
    expect(screen.queryByText('People')).toBeNull()
  })

  it('does not render world NPC names or descriptions on the overview', () => {
    renderDistrictMap()
    expect(screen.queryByText(/lady sorn/i)).toBeNull()
    expect(screen.queryByText(/sable-cairn/i)).toBeNull()
  })

  it('opens with the current district in the ledger: faction, danger, narrative', () => {
    renderDistrictMap()
    const panel = districtLedger()
    // The Pale is current and contested between Compact, Ring, and Restored
    expect(within(panel).getByRole('heading', { name: 'The Pale' })).toBeInTheDocument()
    expect(within(panel).getByText(/Contested — Compact/)).toBeInTheDocument()
    expect(within(panel).getByText(/where the city's accounting breaks down/i)).toBeInTheDocument()
    expect(within(panel).getByText(/● You are here/)).toBeInTheDocument()
  })

  it('shows house district marker for the house district', () => {
    renderDistrictMap()
    expect(screen.getAllByText(/House Valdris/i).length).toBeGreaterThan(0)
  })
})

describe('DistrictMapScreen — city map and ledger panel', () => {
  it('renders the spatial city map with district shapes', () => {
    renderDistrictMap()
    expect(screen.getByRole('figure', { name: 'Map of the city and its environs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'The Warrens' })).toBeInTheDocument()
  })

  it('selecting a district fills the ledger; travel is an explicit action with its cost', async () => {
    const user = userEvent.setup()
    const store = renderDistrictMap()

    await user.click(screen.getByRole('button', { name: 'The Warrens' }))
    const panel = districtLedger()
    expect(within(panel).getByRole('heading', { name: 'The Warrens' })).toBeInTheDocument()
    // Selecting must not travel
    expect(store.getState().game.currentDistrictId).toBe('district-the-pale')

    await user.click(within(panel).getByRole('button', { name: /Travel — 1 slot/ }))
    expect(store.getState().game.currentDistrictId).toBe('district-the-warrens')
  })

  it('explains restricted districts in the ledger and offers no travel', async () => {
    const user = userEvent.setup()
    renderDistrictMap()

    await user.click(screen.getByRole('button', { name: /Gilded Heights — access restricted/ }))
    const panel = districtLedger()
    expect(within(panel).getByText('Access restricted')).toBeInTheDocument()
    // Grounded, per-district reason (destiny-s9iy) rather than a generic placeholder --
    // Gilded Heights has an authored minControlFactionStanding requirement.
    expect(within(panel).getByText(/Requires standing 20\+ with/i)).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /Travel/ })).toBeNull()
  })

  it('shows the near environs as expedition territories', () => {
    renderDistrictMap()
    expect(screen.getByRole('button', { name: /The Ashfields — expedition territory/ })).toBeInTheDocument()
  })

  it('shows a district thumbnail using the district-id-based naming convention (destiny-k9xa)', async () => {
    const user = userEvent.setup()
    renderDistrictMap()

    await user.click(screen.getByRole('button', { name: 'The Warrens' }))
    const panel = districtLedger()
    const thumbnail = within(panel).getByRole('img', { name: 'The Warrens district' })
    expect(thumbnail).toHaveAttribute('src', '/districts/the-warrens.jpg')
  })
})

describe('DistrictMapScreen — danger legend and numeric display (destiny-s9iy)', () => {
  it('shows a danger legend explaining all 5 tiers with their numeric scale', () => {
    renderDistrictMap()
    const legend = screen.getByRole('group', { name: 'Danger level legend' })
    expect(within(legend).getByText(/▲ Low \(1\/5\)/)).toBeInTheDocument()
    expect(within(legend).getByText(/▲▲ Moderate \(2\/5\)/)).toBeInTheDocument()
    expect(within(legend).getByText(/▲▲▲ Elevated \(3\/5\)/)).toBeInTheDocument()
    expect(within(legend).getByText(/▲▲▲▲ High \(4\/5\)/)).toBeInTheDocument()
    expect(within(legend).getByText(/▲▲▲▲▲ Severe \(5\/5\)/)).toBeInTheDocument()
  })

  it('shows the numeric danger value next to the ▲ symbols in the ledger panel', () => {
    renderDistrictMap()
    // The Pale is current, dangerLevel 3
    const panel = districtLedger()
    expect(within(panel).getByText(/▲▲▲ Elevated \(3\/5\)/)).toBeInTheDocument()
  })

  it('explains a structurally-condemned restricted district with its real narrative reason, not a generic placeholder', async () => {
    const user = userEvent.setup()
    renderDistrictMap()

    // The Hollows has accessRestricted:true but no minControlFactionStanding -- its restriction
    // is narrative (condemned after structural collapse), not a faction-standing gate.
    await user.click(screen.getByRole('button', { name: /The Hollows — access restricted/ }))
    const panel = districtLedger()
    expect(within(panel).getByText(/what Valdenmoor looks like when nobody is watching/i)).toBeInTheDocument()
    expect(within(panel).queryByText(/Requires standing/i)).toBeNull()
  })
})
