import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AppProviders } from '../app/AppProviders'
import { MissionPrepScreen } from './MissionPrepScreen'

describe('MissionPrepScreen', () => {
  it('renders the selected squad and supports removing then re-adding a squad member', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <MissionPrepScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Mission Prep' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Selected Squad' })).toBeInTheDocument()
    expect(screen.getByText('Marion Vale')).toBeInTheDocument()
    expect(screen.getByText(/All seeded operatives are currently assigned/i)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Remove from squad' })[0])

    expect(screen.getByRole('button', { name: 'Add to squad' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add to squad' }))

    expect(screen.getByText(/All seeded operatives are currently assigned/i)).toBeInTheDocument()
  })
})
