import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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
    expect(screen.getByRole('button', { name: 'Return to Dashboard' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return to Dashboard' }))
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
      screen.getAllByText(/Territory Broker|Rogue Mercenary|Pale Scavenger|Opportunist/)
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
          combatants: activeCombat.combatants.map((combatant) =>
            combatant.side === 'enemies'
              ? { ...combatant, health: 0 }
              : combatant,
          ),
          outcome: 'victory',
          activeCombatantId: null,
        },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/combat']}>
          <Routes>
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/dashboard" element={<div>Dashboard destination</div>} />
            <Route path="/contracts" element={<div>Work Board destination</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /Engagement Concluded/i })).toBeInTheDocument()
    expect(screen.getByText(/Rewards secured/i)).toBeInTheDocument()
    expect(screen.getByText(/\+22 Marks/i)).toBeInTheDocument()
    expect(screen.getByText(/Contract: none — this was a free clash./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conclude and Return to Dashboard' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conclude and Return to Dashboard' }))

    expect(screen.getByText('Dashboard destination')).toBeInTheDocument()
  })

  it('finalizes aftermath even when the player clicks View Roster instead of Conclude and Return', async () => {
    const user = userEvent.setup()
    const store = createGameStore()

    store.dispatch(gameActions.startCombatEncounter())
    const activeCombat = store.getState().game.activeCombat

    if (!activeCombat) {
      throw new Error('Expected seeded combat encounter to exist in test setup.')
    }

    const injuredAllyId = activeCombat.combatants.find((c) => c.side === 'allies' && c.sourceNpcId)?.sourceNpcId
    if (!injuredAllyId) {
      throw new Error('Expected an ally combatant with a sourceNpcId in test setup.')
    }

    store.dispatch(gameActions.replaceGameState({
      ...store.getState().game,
      activeCombat: {
        ...activeCombat,
        combatants: activeCombat.combatants.map((combatant) =>
          combatant.side === 'enemies'
            ? { ...combatant, health: 0 }
            : combatant.sourceNpcId === injuredAllyId
              ? { ...combatant, health: 0 }
              : combatant,
        ),
        outcome: 'victory',
        activeCombatantId: null,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/combat']}>
          <Routes>
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/roster" element={<div>Roster destination</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'View Roster' }))

    expect(screen.getByText('Roster destination')).toBeInTheDocument()
    expect(store.getState().game.activeCombat).toBeNull()

    const injuredNpc = store.getState().game.npcRuntimeStates.find((npc) => npc.npcId === injuredAllyId)
    expect(injuredNpc?.assignment).toBe('recovering')
  })

  it('sends linked encounters back to the Work Board with explicit contract aftermath copy', async () => {
    const user = userEvent.setup()
    const store = createGameStore()

    store.dispatch(gameActions.startCombatEncounter())
    const activeCombat = store.getState().game.activeCombat

    if (!activeCombat) {
      throw new Error('Expected seeded combat encounter to exist in test setup.')
    }

    store.dispatch(
      gameActions.replaceGameState({
        ...store.getState().game,
        activeCombat: {
          ...activeCombat,
          linkedQuestId: 'quest-harborwatch',
          outcome: 'defeat',
          activeCombatantId: null,
        },
      }),
    )

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/combat']}>
          <Routes>
            <Route path="/combat" element={<CombatScreen />} />
            <Route path="/dashboard" element={<div>Dashboard destination</div>} />
            <Route path="/contracts" element={<div>Work Board destination</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Contract consequence: the Work Board will carry the aftermath of this defeat./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conclude and Return to Work Board' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conclude and Return to Work Board' }))

    expect(screen.getByText('Work Board destination')).toBeInTheDocument()
  })
})
