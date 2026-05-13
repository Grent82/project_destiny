import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialStateWithIda } from '../../application/commands/testFixtures'
import { AppProviders } from '../app/AppProviders'
import { RosterScreen } from './RosterScreen'

describe('RosterScreen', () => {
  it('renders seeded roster entries and updates the selected detail panel', async () => {
    const user = userEvent.setup()
    const store = createGameStore(initialStateWithIda)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <RosterScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'The Roster' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marion Vale/i })).toBeInTheDocument()
    expect(screen.getByText(/'Before the docks' means she survived/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ida Rhys/i }))

    expect(screen.getByText(/A line mechanic turned field engineer/i)).toBeInTheDocument()
  })
})
