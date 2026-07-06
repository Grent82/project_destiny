import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import type { ActiveCombatState } from '../../domain'
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

    await user.click(screen.getByRole('button', { name: /^Attack/ }))

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

describe('CombatScreen — target preview and risk assessment (destiny-8s3n)', () => {
  function renderActiveEncounter(mutate?: (activeCombat: ActiveCombatState) => ActiveCombatState) {
    const store = createGameStore()
    store.dispatch(gameActions.startCombatEncounter())
    const activeCombat = store.getState().game.activeCombat
    if (!activeCombat) throw new Error('Expected seeded combat encounter to exist in test setup.')

    if (mutate) {
      store.dispatch(gameActions.replaceGameState({ ...store.getState().game, activeCombat: mutate(activeCombat) }))
    }

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <CombatScreen />
        </MemoryRouter>
      </AppProviders>,
    )
    return store
  }

  it('shows an auto-target preview with expected damage and hit chance on the Attack button', () => {
    renderActiveEncounter()
    const attackButton = screen.getByRole('button', { name: /^Attack/ })
    expect(attackButton).toHaveTextContent(/Auto-target: .+ \(HP \d+\/\d+\)/)
    expect(attackButton).toHaveTextContent(/Expected: \d+-\d+ damage/)
    expect(attackButton).toHaveTextContent(/\d+% hit chance/)
  })

  it('shows the real -30% mitigation and expiration on the Guard button', () => {
    renderActiveEncounter()
    const guardButton = screen.getByRole('button', { name: /^Guard/ })
    expect(guardButton).toHaveTextContent('🛡')
    expect(guardButton).toHaveTextContent('−30% damage taken')
    expect(guardButton).toHaveTextContent('Expires when you act again')
  })

  it('shows a directional arrow on Advance and Retreat previews', () => {
    renderActiveEncounter((activeCombat) => ({ ...activeCombat, range: 'medium' }))
    expect(screen.getByRole('button', { name: /^Advance/ })).toHaveTextContent('→')
    expect(screen.getByRole('button', { name: /^Retreat/ })).toHaveTextContent('←')
  })

  it('disables Advance and explains why when already at the closest range', () => {
    renderActiveEncounter((activeCombat) => ({ ...activeCombat, range: 'close' }))
    const advanceButton = screen.getByRole('button', { name: /^Advance/ })
    expect(advanceButton).toBeDisabled()
    expect(advanceButton).toHaveAttribute('title', expect.stringMatching(/already at closest range/i))
  })

  it('disables Retreat and explains why when already at the farthest range', () => {
    renderActiveEncounter((activeCombat) => ({ ...activeCombat, range: 'distant' }))
    const retreatButton = screen.getByRole('button', { name: /^Retreat/ })
    expect(retreatButton).toBeDisabled()
    expect(retreatButton).toHaveAttribute('title', expect.stringMatching(/already at farthest range/i))
  })

  it('disables Guard and explains why when the active ally already braced this round', () => {
    renderActiveEncounter((activeCombat) => ({
      ...activeCombat,
      combatants: activeCombat.combatants.map((c) =>
        c.combatantId === activeCombat.activeCombatantId ? { ...c, guardCooldown: true } : c,
      ),
    }))
    const guardButton = screen.getByRole('button', { name: /^Guard/ })
    expect(guardButton).toBeDisabled()
    expect(guardButton).toHaveAttribute('title', expect.stringMatching(/already braced this round/i))
  })

  it('explains disabled buttons with a "not your turn" reason when it is not the ally turn', () => {
    renderActiveEncounter((activeCombat) => ({
      ...activeCombat,
      activeCombatantId: activeCombat.combatants.find((c) => c.side === 'enemies')!.combatantId,
    }))
    const attackButton = screen.getByRole('button', { name: /^Attack/ })
    expect(attackButton).toBeDisabled()
    expect(attackButton).toHaveAttribute('title', expect.stringContaining('Not your turn'))
  })
})
