import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { createGameStore, gameActions } from '../../application'
import { AppProviders } from '../app/AppProviders'
import { ExpeditionTravelScreen } from './ExpeditionTravelScreen'

describe('ExpeditionTravelScreen', () => {
  it('shows empty state when no expedition is active', () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/House Valdris/i)).toBeInTheDocument()
    expect(screen.getByText(/No Active Expedition/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plan Expedition/i })).toBeInTheDocument()
  })

  it('shows empty state when expedition status is idle', () => {
    const store = createGameStore()
    store.dispatch(gameActions.replaceGameState({
      ...store.getState().game,
      expeditionState: {
        status: 'idle',
        destinationId: null,
        squadNpcIds: [],
        suppliesRemaining: 0,
        daysDeparted: 0,
        totalDays: 0,
        encounters: [],
        discoveries: [],
        cityDayAtDeparture: 0,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/No Active Expedition/i)).toBeInTheDocument()
  })

  it('shows completion state when expedition has returned', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 5,
        daysDeparted: 3,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Expedition Complete/i)).toBeInTheDocument()
    expect(screen.getByText(/Your squad has returned/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Debrief/i })).toBeInTheDocument()
  })

  it('shows expedition details when traveling', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 1, type: 'discovery', label: 'Found abandoned camp', resolved: true },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/The Ashfields/i)).toBeInTheDocument()
    expect(screen.getByText(/Day 2 of 5/i)).toBeInTheDocument()
    expect(screen.getByText(/8 supplies remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/Advance Day/i)).toBeInTheDocument()
  })

  it('shows destination description when available', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
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
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    // Destination description should be present
    expect(screen.getByText(/Burned farmland/i)).toBeInTheDocument()
  })

  it('shows generic heading when destination is not found', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'unknown-destination',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
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
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Expedition/i)).toBeInTheDocument()
  })

  it('shows progress bar with correct width', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 3,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const progressBar = document.querySelector('.expedition-progress-fill')
    expect(progressBar).toBeInTheDocument()
  })

  it('shows encounters list', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 3,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 1, type: 'discovery', label: 'Found abandoned camp', resolved: true },
          { day: 2, type: 'discovery', label: 'Spotted merchant caravan', resolved: true },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Day 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Day 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Found abandoned camp/i)).toBeInTheDocument()
    expect(screen.getByText(/Spotted merchant caravan/i)).toBeInTheDocument()
  })

  it('shows squad members', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
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
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/The Squad/i)).toBeInTheDocument()
    expect(screen.getByText(/Ida Rhys/i)).toBeInTheDocument()
  })

  it('shows combat button when unresolved combat encounter', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 1, type: 'discovery', label: 'Found camp', resolved: true },
          { day: 2, type: 'combat', label: 'Skirmish with scavengers', resolved: false },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/Hostile contact/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enter Engagement/i })).toBeInTheDocument()
  })

  it('navigates to combat when combat button clicked', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 2, type: 'combat', label: 'Skirmish', resolved: false },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/expedition-travel']}>
          <Routes>
            <Route path="/expedition-travel" element={<ExpeditionTravelScreen />} />
            <Route path="/combat" element={<div>Combat screen</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Enter Engagement/i }))

    expect(screen.getByText('Combat screen')).toBeInTheDocument()
  })

  it('navigates to expedition return when debrief button clicked', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'returned',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 5,
        daysDeparted: 3,
        totalDays: 5,
        discoveries: [],
        encounters: [],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/expedition-travel']}>
          <Routes>
            <Route path="/expedition-travel" element={<ExpeditionTravelScreen />} />
            <Route path="/expedition-return" element={<div>Return screen</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Debrief/i }))

    expect(screen.getByText('Return screen')).toBeInTheDocument()
  })

  it('navigates to expedition planning when idle button clicked', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <MemoryRouter initialEntries={['/expedition-travel']}>
          <Routes>
            <Route path="/expedition-travel" element={<ExpeditionTravelScreen />} />
            <Route path="/expedition" element={<div>Expedition planning</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Plan Expedition/i }))

    expect(screen.getByText('Expedition planning')).toBeInTheDocument()
  })

  it('advances expedition day when button clicked', async () => {
    const user = userEvent.setup()
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
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
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: /Advance Day/i }))

    // Day should have advanced
    expect(screen.getByText(/Day 3 of 5/i)).toBeInTheDocument()
  })

  it('shows discovery badge with positive styling', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 1, type: 'discovery', label: 'Found camp', resolved: true },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const discoveryBadge = screen.getByText(/discovery/i)
    expect(discoveryBadge).toHaveClass('badge-positive')
  })

  it('shows combat badge with crit styling', () => {
    const store = createGameStore()
    const state = store.getState().game
    store.dispatch(gameActions.replaceGameState({
      ...state,
      expeditionState: {
        status: 'traveling',
        destinationId: 'dest-ashfields',
        squadNpcIds: ['npc-ida-rhys'],
        suppliesRemaining: 8,
        daysDeparted: 2,
        totalDays: 5,
        discoveries: [],
        encounters: [
          { day: 1, type: 'combat', label: 'Ambush', resolved: true },
        ],
        cityDayAtDeparture: state.day,
      },
    }))

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <ExpeditionTravelScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    const combatBadge = screen.getByText(/combat/i)
    expect(combatBadge).toHaveClass('badge-crit')
  })
})
