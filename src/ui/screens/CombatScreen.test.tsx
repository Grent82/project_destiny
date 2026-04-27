import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createGameStore, gameActions } from '../../application'
import { AppProviders } from '../app/AppProviders'
import { CombatScreen } from './CombatScreen'

describe('CombatScreen', () => {
  it('starts a seeded encounter and resolves the first attack action', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <CombatScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Engagement' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start seeded encounter' }))

    expect(screen.getAllByText(/Round 1/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Ash Raider|Bog Skirmisher|Ruin Poacher|Fen Cutthroat/)
        .length,
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Attack' }))

    expect(screen.getByText(/strikes|lands a blow|connects|goes wide|misses|deflected/i)).toBeInTheDocument()
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
        <CombatScreen />
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Conclude encounter' }))

    expect(screen.getByRole('button', { name: 'Start seeded encounter' })).toBeInTheDocument()
  })
})
