import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { App } from './App'
import { AppProviders } from './AppProviders'

describe('App', () => {
  it('renders the route-level navigation shell', () => {
    render(
      <AppProviders>
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Roster' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Combat' })).toBeInTheDocument()
    expect(screen.getByText('300 credits')).toBeInTheDocument()
  })

  it('deploys from mission prep into the combat route', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <MemoryRouter initialEntries={['/missions']}>
          <App />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Deploy to encounter' }))

    expect(screen.getByRole('heading', { name: 'Combat' })).toBeInTheDocument()
    expect(screen.getAllByText(/Round 1/i).length).toBeGreaterThan(0)
  })
})
