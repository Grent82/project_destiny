import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { selectShopOverview } from '../../application/selectors/shops'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { gameStateSchema } from '../../domain'
import { AppProviders } from '../app/AppProviders'
import { ShopsScreen } from './ShopsScreen'

describe('ShopsScreen', () => {
  it('renders seeded shops and updates visible money and owned quantity after purchase', async () => {
    const user = userEvent.setup()
    // Use explicit money=500 and harbor district so purchase test is independent of starting balance/district
    const richState = gameStateSchema.parse({ ...initialGameStateSnapshot, money: 500, currentDistrictId: 'district-harbor' })
    const store = createGameStore(richState)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ShopsScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'The Market' })).toBeInTheDocument()
    expect(screen.getByText('Harbor Provisions')).toBeInTheDocument()
    expect(screen.getByText('Available funds: 500 Marks')).toBeInTheDocument()

    const firstOfferPrice = selectShopOverview({ game: store.getState().game }).shops[0]?.offers[0]?.price ?? 0

    await user.click(screen.getAllByRole('button', { name: 'Buy' })[0])

    expect(screen.getByText(`Available funds: ${500 - firstOfferPrice} Marks`)).toBeInTheDocument()
    expect(screen.getAllByText(/Owned 3/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Best price').length).toBeGreaterThan(0)
    expect(store.getState().game.activityLog[0]?.message).toBe(
      `Purchased Field Medkit from Harbor Provisions for ${firstOfferPrice} Marks.`,
    )
  })

  it('shows a price breakdown section for visible shop offers', () => {
    const pricedState = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': 75,
      },
      districtTension: {
        ...initialGameStateSnapshot.districtTension,
        'district-harbor': 50,
      },
      districts: initialGameStateSnapshot.districts.map((district) =>
        district.districtId === 'district-harbor'
          ? { ...district, marketPressure: 80 }
          : district,
      ),
    })
    const store = createGameStore(pricedState)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ShopsScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getAllByText('Price factors').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Base price:/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Final price:/i).length).toBeGreaterThan(0)
  })
})
