import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import { AppProviders } from '../app/AppProviders'
import { ExpeditionReturnScreen } from './ExpeditionReturnScreen'

describe('ExpeditionReturnScreen', () => {
  it('shows empty state when no expedition is active', () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/No Expedition to Debrief/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Expeditions/i })).toBeInTheDocument()
  })

  it('shows empty state when expedition is still traveling', () => {
    const store = createGameStore()
    store.dispatch(gameActions.startExpedition({
      destinationId: 'dest-valdenmoor-north',
      squadNpcIds: ['npc-ida'],
      supplies: 10,
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/No Expedition to Debrief/i)).toBeInTheDocument()
  })

  it('renders expedition debrief when expedition has returned', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 3,
        totalDays: 5,
        discoveries: [
          { type: 'marks', label: 'Scavenged supplies', amount: 50 },
          { type: 'lore', label: 'Merchant route discovered' },
        ],
        encounters: [
          { day: 1, type: 'discovery', label: 'Found abandoned camp', resolved: true },
          { day: 2, type: 'combat', label: 'Skirmish with scavengers', resolved: true },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/Return from/i)).toBeInTheDocument()
    expect(screen.getByText(/operatives? returned/i)).toBeInTheDocument()
    expect(screen.getByText(/3 days out/i)).toBeInTheDocument()
  })

  it('shows discoveries when expedition found something', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [
          { type: 'marks', label: 'Ancient cache', amount: 150 },
          { type: 'lore', label: 'Rebel encampment location' },
        ],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/What They Found/i)).toBeInTheDocument()
    expect(screen.getByText(/Ancient cache/i)).toBeInTheDocument()
    expect(screen.getByText(/Rebel encampment location/i)).toBeInTheDocument()
    expect(screen.getByText(/marks/)).toBeInTheDocument()
  })

  it('shows empty discoveries message when nothing was found', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/What They Found/i)).toBeInTheDocument()
    expect(screen.getByText(/Nothing of note/i)).toBeInTheDocument()
  })

  it('shows what happened during absence', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 4,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/What Happened Here/i)).toBeInTheDocument()
    expect(screen.getByText(/4 days passed/i)).toBeInTheDocument()
    expect(screen.getByText(/The city moved on without you/i)).toBeInTheDocument()
  })

  it('handles singular vs plural operative correctly', () => {
    const store = createGameStore()
    const state = store.getState().game

    // Single operative
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    const { rerender } = render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/1 operative returned/i)).toBeInTheDocument()

    // Multiple operatives
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida', 'npc-john', 'npc-maria'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    rerender(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/3 operatives returned/i)).toBeInTheDocument()
  })

  it('navigates to dashboard when closing debrief', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/expedition-return']}>
          <Routes>
            <Route path="/expedition-return" element={<ExpeditionReturnScreen />} />
            <Route path="/dashboard" element={<div>Dashboard loaded</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    const closeButton = screen.getByRole('button', { name: /Close Debrief/i })
    await user.click(closeButton)

    // Should navigate to dashboard and dispatch resolveExpedition
    expect(screen.getByText('Dashboard loaded')).toBeInTheDocument()
  })

  it('shows destination name in heading when available', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-valdenmoor-north',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    // Destination name should appear in the heading
    expect(screen.getByRole('heading', { name: /Return from/i })).toBeInTheDocument()
  })

  it('shows generic heading when destination is not found', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'unknown-destination',
        squadNpcIds: ['npc-ida'],
        suppliesRemaining: 5,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionReturnScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Return from the field/i)).toBeInTheDocument()
  })
})
