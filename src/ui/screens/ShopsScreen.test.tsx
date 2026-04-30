import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createGameStore } from '../../application'
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
        <ShopsScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'The Market' })).toBeInTheDocument()
    expect(screen.getByText('Harbor Provisions')).toBeInTheDocument()
    expect(screen.getByText('Available funds: 500 Marks')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Buy' })[0])

    expect(screen.getByText('Available funds: 405 Marks')).toBeInTheDocument()
    expect(screen.getAllByText(/Owned 3/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Purchased Field Medkit from Harbor Provisions for \d+ Marks/i)).toBeInTheDocument()
    expect(screen.getAllByText('Best price').length).toBeGreaterThan(0)
  })
})
