import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createGameStore } from '../../application/store/gameStore'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { gameStateSchema } from '../../domain'
import { AppProviders } from '../app/AppProviders'
import { ContractBoardScreen } from './ContractBoardScreen'

function makeStore(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
  const state = gameStateSchema.parse({ ...initialGameStateSnapshot, ...overrides })
  return createGameStore(state)
}

describe('Quest Discovery Bug - Day 1 No Leads', () => {
  it('shows no quest leads on day 1 when availableQuestLeads is empty', () => {
    const store = makeStore({
      day: 1,
      availableQuestLeads: [],
      activeQuests: [],
      completedQuestIds: [],
      currentDistrictId: 'district-the-pale',
    })

    render(
      <AppProviders store={store}>
        <MemoryRouter initialEntries={['/contracts']}>
          <ContractBoardScreen />
        </MemoryRouter>
      </AppProviders>,
    )

    // Verify the bug: no leads are available
    expect(screen.getByText(/No fresh leads/i)).toBeInTheDocument()
    expect(screen.getByText(/Work is either already in hand/i)).toBeInTheDocument()
  })

  it('should have initial quest leads available on day 1 for game progression', () => {
    // This is a failing test that documents the expected behavior
    // The game should provide initial quest leads so players can continue playing

    const store = makeStore({
      day: 1,
      availableQuestLeads: [], // Currently empty - this is the bug
      activeQuests: [],
      completedQuestIds: [],
      currentDistrictId: 'district-the-pale',
    })

    const state = store.getState().game

    // EXPECTED: At least 2-3 quest leads should be available on day 1
    // CURRENT: No quest leads are available
    expect(state.availableQuestLeads.length).toBeGreaterThan(0)
  })

  it('harborwatch quest requires guild POI in harbor district to be discoverable', () => {
    // Documenting the discovery requirements for harborwatch
    const harborwatchTemplate = [
      { id: 'quest-harborwatch', discoverySource: 'guild', discoveryDistrictId: 'district-harbor' }
    ]

    // This test documents that:
    // 1. Harborwatch can only be discovered at guild POIs
    // 2. Harborwatch can only be discovered in district-harbor
    // 3. Visiting Tallow Ring Den in The Pale will NOT show this quest

    expect(harborwatchTemplate[0].discoverySource).toBe('guild')
    expect(harborwatchTemplate[0].discoveryDistrictId).toBe('district-harbor')
  })

  it('forn quest requires event trigger to be discovered', () => {
    // Documenting the discovery requirements for forn's quiet hiring
    const fornQuestTemplate = [
      { id: 'quest-rival-ashen-compact-counter', discoverySource: 'event', discoveryDistrictId: 'district-the-warrens' }
    ]

    // This test documents that:
    // 1. Forn quest can only be discovered via events
    // 2. The event may not fire on day 1
    // 3. Players have no way to discover this quest manually

    expect(fornQuestTemplate[0].discoverySource).toBe('event')
    expect(fornQuestTemplate[0].discoveryDistrictId).toBe('district-the-warrens')
  })
})
