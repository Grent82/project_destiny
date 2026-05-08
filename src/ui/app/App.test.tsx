import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { App } from './App'
import { AppProviders } from './AppProviders'

function makeStoreWithOpeningSeen() {
  return createGameStore({ ...initialGameStateSnapshot, hasSeenOpening: true })
}

describe('App', () => {
  it('renders the route-level navigation shell', () => {
    render(
      <AppProviders store={makeStoreWithOpeningSeen()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /House Valdris/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Roster' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'End Day →' }).length).toBeGreaterThan(0)
  })

  it('deploys from mission prep into the combat route', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders store={makeStoreWithOpeningSeen()}>
        <MemoryRouter initialEntries={['/missions']}>
          <App />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Deploy to encounter' }))

    expect(screen.getByRole('heading', { name: 'Engagement' })).toBeInTheDocument()
    expect(screen.getAllByText(/Round 1/i).length).toBeGreaterThan(0)
  })

  it('preserves venue context when entering a local feature from a district poi', async () => {
    const user = userEvent.setup()
    const store = createGameStore({
      ...initialGameStateSnapshot,
      hasSeenOpening: true,
      currentDistrictId: 'district-the-pale',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/district/district-the-pale/poi/poi-pale-pale-market']}>
          <App />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Pale Market' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter →' }))

    expect(screen.getByRole('heading', { name: 'The Market' })).toBeInTheDocument()
    expect(screen.getByText(/The Pale \/ Pale Market/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to Pale Market/i })).toBeInTheDocument()
  })
})
