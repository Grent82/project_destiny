/**
 * Tests for house prestige selector and content gates (destiny-hzbc).
 */

import { describe, it, expect } from 'vitest'
import { selectHousePrestige, selectContentGates, PRESTIGE_TIER_LABELS } from './house'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

function stateWithExterior(tier: 'ruined' | 'patched' | 'maintained' | 'restored' | 'grand'): GameState {
  return {
    ...initialGameStateSnapshot,
    house: { ...initialGameStateSnapshot.house, exteriorState: tier },
  }
}

describe('selectHousePrestige', () => {
  it('returns score 0 and collapsed tier for fully ruined house', () => {
    // Create state where all rooms are damaged (no intact rooms) and exterior is ruined
    const purelyRuined: GameState = {
      ...initialGameStateSnapshot,
      house: {
        ...initialGameStateSnapshot.house,
        exteriorState: 'ruined',
        rooms: initialGameStateSnapshot.house.rooms.map((r) => ({ ...r, state: 'damaged' as const })),
      },
      installedHouseModules: [],
    }
    const store = createGameStore(purelyRuined)
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.score).toBe(0)
    expect(prestige.tier).toBe('collapsed')
    expect(prestige.label).toBe('Collapsed')
  })

  it('returns occupied tier for patched exterior', () => {
    const store = createGameStore(stateWithExterior('patched'))
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.tier).toBe('occupied')
    expect(prestige.score).toBeGreaterThanOrEqual(10)
  })

  it('returns established tier for maintained exterior', () => {
    const store = createGameStore(stateWithExterior('maintained'))
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.tier).toBe('established')
    expect(prestige.score).toBeGreaterThanOrEqual(25)
  })

  it('returns recognized tier for restored exterior', () => {
    const store = createGameStore(stateWithExterior('restored'))
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.tier).toBe('recognized')
    expect(prestige.score).toBeGreaterThanOrEqual(50)
  })

  it('returns prominent tier for grand exterior', () => {
    const store = createGameStore(stateWithExterior('grand'))
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.tier).toBe('prominent')
    expect(prestige.score).toBeGreaterThanOrEqual(75)
  })

  it('increases score with installed house modules', () => {
    const state: GameState = {
      ...stateWithExterior('ruined'),
      installedHouseModules: [
        { moduleItemId: 'item-module-lock-reinforcement', installedAtDay: 1 },
        { moduleItemId: 'item-module-herb-garden', installedAtDay: 2 },
      ],
    }
    const store = createGameStore(state)
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.score).toBeGreaterThan(0)
    expect(prestige.breakdown.moduleScore).toBe(8) // 2 modules × 4
  })

  it('increases score with rooms that have functions assigned', () => {
    const state: GameState = {
      ...stateWithExterior('patched'),
      house: {
        ...initialGameStateSnapshot.house,
        exteriorState: 'patched',
        rooms: initialGameStateSnapshot.house.rooms.map((r, i) =>
          i === 0 ? { ...r, state: 'intact' as const, roomFunction: 'archive' as const } : r,
        ),
      },
    }
    const store = createGameStore(state)
    const prestige = selectHousePrestige(store.getState())
    expect(prestige.breakdown.roomsWithFunction).toBe(1)
  })

  it('includes breakdown with all contributing factors', () => {
    const store = createGameStore()
    const { breakdown } = selectHousePrestige(store.getState())
    expect(breakdown).toHaveProperty('exteriorScore')
    expect(breakdown).toHaveProperty('roomsWithFunction')
    expect(breakdown).toHaveProperty('intactOnly')
    expect(breakdown).toHaveProperty('moduleScore')
  })
})

describe('selectContentGates', () => {
  it('blocks all contracts for collapsed tier', () => {
    const store = createGameStore(stateWithExterior('ruined'))
    const gates = selectContentGates(store.getState())
    expect(gates.canAccessContracts).toHaveLength(0)
    expect(gates.socialScenesUnlocked).toBe(false)
    expect(gates.specialistRecruitUnlocked).toBe(false)
  })

  it('allows petty contracts for occupied tier', () => {
    const store = createGameStore(stateWithExterior('patched'))
    const gates = selectContentGates(store.getState())
    expect(gates.canAccessContracts).toContain('petty')
    expect(gates.specialistRecruitUnlocked).toBe(true)
  })

  it('unlocks social scenes at recognized tier', () => {
    const store = createGameStore(stateWithExterior('restored'))
    const gates = selectContentGates(store.getState())
    expect(gates.socialScenesUnlocked).toBe(true)
    expect(gates.canAccessContracts).toContain('high_tier')
  })

  it('unlocks political leverage only at prominent tier', () => {
    const grandStore = createGameStore(stateWithExterior('grand'))
    const restoredStore = createGameStore(stateWithExterior('restored'))
    expect(selectContentGates(grandStore.getState()).politicalLeverageUnlocked).toBe(true)
    expect(selectContentGates(restoredStore.getState()).politicalLeverageUnlocked).toBe(false)
  })
})

describe('PRESTIGE_TIER_LABELS', () => {
  it('has all 5 tier labels', () => {
    const tiers = ['collapsed', 'occupied', 'established', 'recognized', 'prominent'] as const
    tiers.forEach((t) => {
      expect(PRESTIGE_TIER_LABELS[t]).toBeTruthy()
    })
  })
})
