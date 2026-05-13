/**
 * Tests for house fortificationLevel and raid event system (destiny-xrv7).
 */

import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectDefenseRating } from './house'
import type { GameState } from '../../domain/game/contracts'

const SQUAD_NPC = 'npc-marion-vale'

describe('selectDefenseRating', () => {
  it('returns 0 for base state (no fortification, no guards)', () => {
    const store = createGameStore()
    expect(selectDefenseRating(store.getState())).toBe(0)
  })

  it('increases with fortificationLevel', () => {
    const store = createGameStore()
    store.dispatch(gameActions.upgradeFortification({ cost: 0 })) // cost 0 for test
    expect(selectDefenseRating(store.getState())).toBeGreaterThan(0)
  })

  it('increases when NPCs are on defense assignment', () => {
    const store = createGameStore()
    store.dispatch(gameActions.setNpcAssignment({ npcId: SQUAD_NPC, assignment: 'defense' }))
    expect(selectDefenseRating(store.getState())).toBeGreaterThan(0)
  })

  it('stacks fortification and guard contributions', () => {
    const store = createGameStore()
    store.dispatch(gameActions.upgradeFortification({ cost: 0 }))
    store.dispatch(gameActions.setNpcAssignment({ npcId: SQUAD_NPC, assignment: 'defense' }))
    const rating = selectDefenseRating(store.getState())
    // fortLevel=1 × 15 + 1 guard × 10 = 25 minimum
    expect(rating).toBeGreaterThanOrEqual(25)
  })
})

describe('upgradeFortification action', () => {
  it('increments fortificationLevel by 1', () => {
    const store = createGameStore({ ...initialGameStateSnapshot, money: 200 })
    store.dispatch(gameActions.upgradeFortification({ cost: 50 }))
    expect(store.getState().game.house.fortificationLevel).toBe(1)
  })

  it('deducts cost from money', () => {
    const store = createGameStore({ ...initialGameStateSnapshot, money: 200 })
    store.dispatch(gameActions.upgradeFortification({ cost: 50 }))
    expect(store.getState().game.money).toBe(150)
  })

  it('does nothing if not enough money', () => {
    const store = createGameStore({ ...initialGameStateSnapshot, money: 10 })
    store.dispatch(gameActions.upgradeFortification({ cost: 100 }))
    expect(store.getState().game.house.fortificationLevel).toBe(0)
    expect(store.getState().game.money).toBe(10)
  })

  it('caps at level 5', () => {
    const stateAtMax: GameState = {
      ...initialGameStateSnapshot,
      money: 1000,
      house: { ...initialGameStateSnapshot.house, fortificationLevel: 5 },
    }
    const store = createGameStore(stateAtMax)
    store.dispatch(gameActions.upgradeFortification({ cost: 50 }))
    expect(store.getState().game.house.fortificationLevel).toBe(5)
    expect(store.getState().game.money).toBe(1000) // no cost deducted
  })

  it('logs the upgrade event', () => {
    const store = createGameStore({ ...initialGameStateSnapshot, money: 200 })
    store.dispatch(gameActions.upgradeFortification({ cost: 50 }))
    const log = store.getState().game.activityLog
    expect(log.some((e) => e.message.includes('Fortification'))).toBe(true)
  })
})

describe('resolveRaid action', () => {
  describe('faction_enforcement raid', () => {
    it('repels a weak raid when defense is high', () => {
      const stateWithFort: GameState = {
        ...initialGameStateSnapshot,
        money: 500,
        house: { ...initialGameStateSnapshot.house, fortificationLevel: 5 },
        roster: initialGameStateSnapshot.roster.map((n) =>
          n.npcId === SQUAD_NPC ? { ...n, assignment: 'defense' as const } : n,
        ),
      }
      const store = createGameStore(stateWithFort)
      const moneyBefore = store.getState().game.money
      store.dispatch(gameActions.resolveRaid({ raidStrength: 1, raidType: 'faction_enforcement' }))
      // Repelled: no money loss
      expect(store.getState().game.money).toBe(moneyBefore)
      expect(
        store.getState().game.activityLog.some((e) => e.message.includes('withdrew') || e.message.includes('held')),
      ).toBe(true)
    })

    it('inflicts money penalty when defense is low', () => {
      const store = createGameStore({ ...initialGameStateSnapshot, money: 500 })
      const moneyBefore = store.getState().game.money
      store.dispatch(gameActions.resolveRaid({ raidStrength: 20, raidType: 'faction_enforcement' }))
      expect(store.getState().game.money).toBeLessThan(moneyBefore)
    })
  })

  describe('criminal raid', () => {
    it('steals money on undefended house', () => {
      const store = createGameStore({ ...initialGameStateSnapshot, money: 500 })
      store.dispatch(gameActions.resolveRaid({ raidStrength: 15, raidType: 'criminal' }))
      expect(store.getState().game.money).toBeLessThan(500)
    })

    it('repels with high defense', () => {
      const stateWithFort: GameState = {
        ...initialGameStateSnapshot,
        money: 500,
        house: { ...initialGameStateSnapshot.house, fortificationLevel: 5 },
        roster: initialGameStateSnapshot.roster.map((n) =>
          n.npcId === SQUAD_NPC ? { ...n, assignment: 'defense' as const } : n,
        ),
      }
      const store = createGameStore(stateWithFort)
      const moneyBefore = store.getState().game.money
      store.dispatch(gameActions.resolveRaid({ raidStrength: 1, raidType: 'criminal' }))
      expect(store.getState().game.money).toBe(moneyBefore)
    })
  })

  describe('the_remainder raid', () => {
    it('reduces morale when undefended', () => {
      const store = createGameStore()
      const moraleBefore = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.morale
      store.dispatch(gameActions.resolveRaid({ raidStrength: 30, raidType: 'the_remainder' }))
      const moraleAfter = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.morale
      expect(moraleAfter).toBeLessThan(moraleBefore)
    })

    it('increases stress when undefended', () => {
      const store = createGameStore()
      const stressBefore = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.stress
      store.dispatch(gameActions.resolveRaid({ raidStrength: 30, raidType: 'the_remainder' }))
      const stressAfter = store.getState().game.roster.find((n) => n.npcId === SQUAD_NPC)!.states.stress
      expect(stressAfter).toBeGreaterThan(stressBefore)
    })
  })

  it('money never goes below zero', () => {
    const store = createGameStore({ ...initialGameStateSnapshot, money: 10 })
    store.dispatch(gameActions.resolveRaid({ raidStrength: 100, raidType: 'criminal' }))
    expect(store.getState().game.money).toBeGreaterThanOrEqual(0)
  })
})
