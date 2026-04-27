import { render, screen } from '@testing-library/react'
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
})
