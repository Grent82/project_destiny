import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const MOCK_FACTIONS = [
  { id: 'faction-civic-compact', name: 'Civic Compact', agenda: 'Maintain order.', description: '', territory: [], tags: [] },
  { id: 'faction-gilded-court', name: 'Gilded Court', agenda: 'Expand elite influence.', description: '', territory: [], tags: [] },
  { id: 'faction-foundry-league', name: 'Foundry League', agenda: 'Control industrial output.', description: '', territory: [], tags: [] },
  { id: 'faction-tallow-ring', name: 'The Tallow Ring', agenda: 'Profit from the gaps.', description: '', territory: [], tags: [] },
  { id: 'faction-restored', name: 'The Restored', agenda: 'Abolish birth controls.', description: '', territory: [], tags: [] },
]

vi.mock('../content/contentCatalog', () => ({
  contentCatalog: {
    districts: [],
    districtsById: new Map(),
    factions: MOCK_FACTIONS,
    factionsById: new Map(MOCK_FACTIONS.map((f) => [f.id, f])),
    items: [],
    itemsById: new Map(),
    npcs: [],
    npcsById: new Map(),
    shops: [],
    shopsById: new Map(),
  },
}))

import { AppProviders } from '../../ui/app/AppProviders'
import { FactionsScreen } from '../../ui/screens/FactionsScreen'
import {
  selectCityDials,
  selectFactionStanding,
  selectFactionStandings,
} from '../selectors/factions'
import { initialGameStateSnapshot } from './initialGameState'
import { createGameStore } from './gameStore'
import { gameActions } from './gameSlice'

describe('adjustFactionStanding', () => {
  it('adjusts faction standing by delta', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.adjustFactionStanding({ factionId: 'faction-civic-compact', delta: 10 }),
    )
    const standing = store.getState().game.factionStandings['faction-civic-compact']
    expect(standing).toBe(20) // initial 10 + delta 10
  })

  it('clamps faction standing at maximum 100', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.adjustFactionStanding({ factionId: 'faction-civic-compact', delta: 200 }),
    )
    expect(store.getState().game.factionStandings['faction-civic-compact']).toBe(100)
  })

  it('clamps faction standing at minimum -100', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.adjustFactionStanding({ factionId: 'faction-gilded-court', delta: -200 }),
    )
    expect(store.getState().game.factionStandings['faction-gilded-court']).toBe(-100)
  })

  it('defaults to 0 for unknown faction before applying delta', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.adjustFactionStanding({ factionId: 'faction-unknown', delta: 30 }),
    )
    expect(store.getState().game.factionStandings['faction-unknown']).toBe(30)
  })
})

describe('adjustCityDial', () => {
  it('adjusts a city dial by delta', () => {
    const store = createGameStore()
    store.dispatch(gameActions.adjustCityDial({ dial: 'control', delta: 10 }))
    expect(store.getState().game.cityDials.control).toBe(55) // initial 45 + 10
  })

  it('clamps city dial at maximum 100', () => {
    const store = createGameStore()
    store.dispatch(gameActions.adjustCityDial({ dial: 'unrest', delta: 200 }))
    expect(store.getState().game.cityDials.unrest).toBe(100)
  })

  it('clamps city dial at minimum 0', () => {
    const store = createGameStore()
    store.dispatch(gameActions.adjustCityDial({ dial: 'prosperity', delta: -200 }))
    expect(store.getState().game.cityDials.prosperity).toBe(0)
  })
})

describe('selectFactionStanding', () => {
  it('returns correct standing for a known faction', () => {
    const store = createGameStore()
    const state = store.getState()
    expect(selectFactionStanding('faction-civic-compact')(state)).toBe(10)
    expect(selectFactionStanding('faction-gilded-court')(state)).toBe(-20)
    expect(selectFactionStanding('faction-tallow-ring')(state)).toBe(15)
  })

  it('returns 0 for an unknown faction', () => {
    const store = createGameStore()
    const state = store.getState()
    expect(selectFactionStanding('faction-unknown')(state)).toBe(0)
  })
})

describe('selectFactionStandings and selectCityDials', () => {
  it('returns all faction standings from initial state', () => {
    const store = createGameStore()
    const standings = selectFactionStandings(store.getState())
    expect(standings['faction-civic-compact']).toBe(10)
    expect(standings['faction-gilded-court']).toBe(-20)
    expect(standings['faction-foundry-league']).toBe(5)
    expect(standings['faction-tallow-ring']).toBe(15)
    expect(standings['faction-restored']).toBe(0)
  })

  it('returns city dials from initial state', () => {
    const store = createGameStore()
    const dials = selectCityDials(store.getState())
    expect(dials.control).toBe(45)
    expect(dials.prosperity).toBe(35)
    expect(dials.unrest).toBe(55)
    expect(dials.corruption).toBe(60)
  })
})

describe('FactionsScreen', () => {
  it('renders all 5 factions', () => {
    render(
      <AppProviders>
        <FactionsScreen />
      </AppProviders>,
    )

    expect(screen.getByText('Civic Compact')).toBeInTheDocument()
    expect(screen.getByText('Gilded Court')).toBeInTheDocument()
    expect(screen.getByText('Foundry League')).toBeInTheDocument()
    expect(screen.getByText('The Tallow Ring')).toBeInTheDocument()
    expect(screen.getByText('The Restored')).toBeInTheDocument()
  })

  it('shows correct standing tier labels', () => {
    render(
      <AppProviders>
        <FactionsScreen />
      </AppProviders>,
    )

    // faction-gilded-court standing = -20 → Cold (boundary)
    // faction-civic-compact standing = 10 → Neutral
    expect(screen.getAllByText('Neutral').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Cold')).toBeInTheDocument()
  })

  it('renders city dials section', () => {
    render(
      <AppProviders>
        <FactionsScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'City Dials' })).toBeInTheDocument()
  })
})
