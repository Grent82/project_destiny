import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import { AppProviders } from '../app/AppProviders'
import { CombatScreen } from './CombatScreen'

describe('CombatScreen', () => {
  it('shows a guarded empty state when no encounter is active', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <MemoryRouter>
          <CombatScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Engagement' })).toBeInTheDocument()
    expect(screen.getByText(/No encounter is active/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Return to contracts' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return to contracts' }))
  })

  it('renders and resolves an active encounter', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    store.dispatch(gameActions.startCombatEncounter())

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <CombatScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getAllByText(/Round 1/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Three-range command combat/i)).toBeInTheDocument()
    expect(screen.getByText(/Medium Range/i)).toBeInTheDocument()
    expect(screen.getByText(/Auto-target the most vulnerable enemy/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/Ash Raider|Bog Skirmisher|Ruin Poacher|Fen Cutthroat/)
        .length,
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Attack' }))

    expect(screen.getAllByText(/strikes|lands a blow|connects|goes wide|misses|deflected/i).length).toBeGreaterThan(0)
  })

  it('lets the player conclude a resolved encounter', async () => {
    const user = userEvent.setup()
    const store = createGameStore()

    store.dispatch(gameActions.startCombatEncounter())
    const activeCombat = store.getState().game.activeCombat

    if (!activeCombat) {
      throw new Error('Expected seeded combat encounter to exist in test setup.')
    }

    store.dispatch(gameActions.replaceGameState({
      ...store.getState().game,
      activeCombat: {
        ...activeCombat,
        outcome: 'victory',
        activeCombatantId: null,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <CombatScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Conclude encounter' }))

    expect(screen.getByRole('button', { name: 'Return to contracts' })).toBeInTheDocument()
  })
})
