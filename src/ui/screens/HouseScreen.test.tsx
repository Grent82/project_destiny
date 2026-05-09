import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { HouseScreen } from './HouseScreen'

describe('HouseScreen', () => {
  it('shows authored room discoveries directly on the searched room card', async () => {
    const user = userEvent.setup()
    const store = createGameStore(initialGameStateSnapshot)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <HouseScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const bureauCard = screen.getByText('Bureau').closest('article')
    expect(bureauCard).not.toBeNull()
    if (!bureauCard) {
      throw new Error('Expected Bureau room card')
    }

    await user.click(within(bureauCard).getByRole('button', { name: 'Search' }))

    expect(within(bureauCard).getByText(/A forgotten strongbox behind the panelling/i)).toBeInTheDocument()
    expect(within(bureauCard).getByText(/22 Marks in pre-Breach reserve coin/i)).toBeInTheDocument()
    expect(within(bureauCard).getByText(/two ledgers removed the night the house fell/i)).toBeInTheDocument()
  })
})
