import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore } from '../../application'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { InvestigationScreen } from './InvestigationScreen'

describe('InvestigationScreen', () => {
  it('renders Investigation heading', () => {
    const store = createGameStore(initialGameStateSnapshot)
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByRole('heading', { name: 'Investigation' })).toBeInTheDocument()
  })

  it('shows empty-state message when no active investigation', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeQuests: [],
    })
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByText(/No investigation is currently active/i)).toBeInTheDocument()
  })

  it('renders the House Valdris eyebrow', () => {
    const store = createGameStore(initialGameStateSnapshot)
    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    expect(screen.getByText('House Valdris')).toBeInTheDocument()
  })
})
