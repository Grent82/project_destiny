/**
 * Browser-level smoke playthroughs (destiny-4u73.7)
 *
 * Thin UI smoke tests that verify route reachability and key action wiring.
 * These complement the command-level playthrough harness by proving that the
 * same scenario intent is honoured in the rendered UI layer.
 *
 * Scenarios covered:
 *   1. Golden-path: Dashboard renders day/money, End Day advances state
 *   2. Investigation route: investigation screen renders with district context
 *   3. Contract execution route: on-site screen accepts a delivery quest
 *   4. House route: house screen renders rooms and the ledger link
 */
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import { createGameStore } from '../../application/store/gameStore'
import { gameActions } from '../../application/store/gameSlice'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { getQuestTemplates } from '../../application/content/contentCatalog'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { addQuestLeadIfNew, acceptQuestFromLead } from '../../application/commands/questLifecycle'
import { AppProviders } from '../app/AppProviders'
import { DashboardScreen } from '../screens/DashboardScreen'
import { ContractExecutionScreen } from '../screens/ContractExecutionScreen'
import { HouseScreen } from '../screens/HouseScreen'
import { GlobalStatusBar } from '../app/GlobalStatusBar'
import { InvestigationScreen } from '../screens/InvestigationScreen'
import type { GameState } from '../../domain/game/contracts'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

function memorySaveStore() {
  return {
    load: () => null,
    save: () => {},
    clear: () => {},
  }
}

// ─── Scenario 1: Golden-path Dashboard smoke ──────────────────────────────────

describe('Browser smoke — golden-path dashboard', () => {
  it('renders day in the GlobalStatusBar', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      money: 500,
      day: 3,
    })

    render(
      <AppProviders store={store}>
        <GlobalStatusBar />
      </AppProviders>,
    )

    // GlobalStatusBar renders "Day 3 · morning" style
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('End Day button in GlobalStatusBar advances the day', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ ...initialGameStateSnapshot, day: 1 })

    render(
      <AppProviders store={store}>
        <GlobalStatusBar />
      </AppProviders>,
    )

    const endDayBtn = screen.getByRole('button', { name: /End Day/i })
    expect(endDayBtn).toBeTruthy()

    await act(async () => {
      await user.click(endDayBtn)
    })

    expect(store.getState().game.day).toBe(2)
  })

  it('shows active quest in the Dashboard Recommended Actions panel', () => {
    const harborwatch = getQuestTemplates().find((q) => q.id === 'quest-harborwatch')!
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeQuests: [createQuestRuntime(harborwatch, 1)],
    })

    render(
      <AppProviders store={store}>
        <DashboardScreen saveStore={memorySaveStore()} />
      </AppProviders>,
    )

    expect(screen.getByText('The Harborwatch Dispute')).toBeTruthy()
  })
})

// ─── Scenario 2: Contract execution route smoke ───────────────────────────────

describe('Browser smoke — contract execution route (delivery)', () => {
  const QUEST_ID = 'quest-nightbloom-extract'
  const DISTRICT_ID = 'district-the-hollows'

  function makeDeliveryState(): GameState {
    const state = cloneState(initialGameStateSnapshot)
    addQuestLeadIfNew(state, QUEST_ID, { discoveryDistrictId: DISTRICT_ID })
    acceptQuestFromLead(state, QUEST_ID)
    return { ...state, currentDistrictId: DISTRICT_ID }
  }

  it('renders the on-site execution screen for a delivery quest', () => {
    const store = createGameStore(makeDeliveryState())

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={[`/contracts/${QUEST_ID}/execute`]}>
          <Routes>
            <Route path="/contracts/:questId/execute" element={<ContractExecutionScreen />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'On-Site Handoff' })).toBeInTheDocument()
  })

  it('completing the two-step flow resolves the quest', async () => {
    const user = userEvent.setup()
    const store = createGameStore(makeDeliveryState())

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={[`/contracts/${QUEST_ID}/execute`]}>
          <Routes>
            <Route path="/contracts/:questId/execute" element={<ContractExecutionScreen />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Make contact and set the terms/i }))
    })
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Spend the watch and make the handoff/i }))
    })

    expect(store.getState().game.completedQuestIds).toContain(QUEST_ID)
  })
})

// ─── Scenario 3: House route smoke ───────────────────────────────────────────

describe('Browser smoke — house screen', () => {
  it('renders house screen without crashing', () => {
    const store = createGameStore(initialGameStateSnapshot)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <HouseScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: /The House/i })).toBeInTheDocument()
  })

  it('renders the "View House Accounts" link', () => {
    const store = createGameStore(initialGameStateSnapshot)

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <HouseScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByText(/View House Accounts/i)).toBeInTheDocument()
  })
})

// ─── Scenario 4: Investigation route smoke (non-golden branch) ────────────────

describe('Browser smoke — investigation screen (non-golden: no active investigation)', () => {
  it('renders investigation screen without crashing when no investigation is active', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeInvestigation: null,
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter>
          <InvestigationScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    // The screen should render a heading or empty state — not throw
    expect(document.querySelector('.screen-panel')).toBeTruthy()
  })

  it('dispatching an investigation action updates state visibly', () => {
    const ledgerRecovery = getQuestTemplates().find((q) => q.id === 'quest-ledger-recovery')!
    const store = createGameStore({
      ...initialGameStateSnapshot,
      activeQuests: [createQuestRuntime(ledgerRecovery, 1)],
      currentDistrictId: 'district-the-pale',
    })

    // Dispatch investigation start via slice
    act(() => {
      store.dispatch(gameActions.startInvestigation({ questId: 'quest-ledger-recovery' }))
    })

    const state = store.getState().game
    expect(state.activeInvestigation?.questId).toBe('quest-ledger-recovery')
    expect(state.activeInvestigation?.stage).toBe('approach-selection')
  })
})
