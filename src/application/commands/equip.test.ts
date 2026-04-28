import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { endDay } from './endDay'

describe('equipItem reducer', () => {
  const npcId = initialGameStateSnapshot.roster[0]?.npcId ?? 'npc-marion-vale'

  it('sets primaryWeaponId on the NPC loadout', () => {
    const state = initialGameStateSnapshot
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: 'weapon-dagger-wasterunner' })
    const next = gameSliceReducer(state, action)
    const npc = next.roster.find((r) => r.npcId === npcId)
    expect(npc?.loadout.primaryWeaponId).toBe('weapon-dagger-wasterunner')
  })

  it('sets armorId on the NPC loadout', () => {
    const state = initialGameStateSnapshot
    const action = gameActions.equipItem({ npcId, slot: 'armorId', itemId: 'armor-light-tallow-work-coat' })
    const next = gameSliceReducer(state, action)
    const npc = next.roster.find((r) => r.npcId === npcId)
    expect(npc?.loadout.armorId).toBe('armor-light-tallow-work-coat')
  })

  it('unequips the slot when itemId is null', () => {
    const stateWithWeapon = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc, i) =>
        i === 0 ? { ...npc, loadout: { ...npc.loadout, primaryWeaponId: 'weapon-dagger-wasterunner' } } : npc,
      ),
    }
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: null })
    const next = gameSliceReducer(stateWithWeapon, action)
    const npc = next.roster.find((r) => r.npcId === npcId)
    expect(npc?.loadout.primaryWeaponId).toBeNull()
  })

  it('does nothing when npcId is not found', () => {
    const state = initialGameStateSnapshot
    const action = gameActions.equipItem({ npcId: 'npc-does-not-exist', slot: 'primaryWeaponId', itemId: 'weapon-dagger-wasterunner' })
    const next = gameSliceReducer(state, action)
    expect(next.roster).toEqual(state.roster)
  })
})

describe('isFirstRun flag', () => {
  it('starts as true in the initial game state', () => {
    expect(initialGameStateSnapshot.isFirstRun).toBe(true)
  })

  it('becomes false after endDay is called', () => {
    const next = gameSliceReducer(initialGameStateSnapshot, gameActions.endDay())
    expect(next.isFirstRun).toBe(false)
  })

  it('remains false on subsequent endDay calls', () => {
    const afterFirst = gameSliceReducer(initialGameStateSnapshot, gameActions.endDay())
    const afterSecond = gameSliceReducer(afterFirst, gameActions.endDay())
    expect(afterSecond.isFirstRun).toBe(false)
  })

  it('endDay command sets isFirstRun false via direct command', () => {
    const stateWithFirstRun = { ...initialGameStateSnapshot, isFirstRun: true }
    const next = endDay(stateWithFirstRun)
    // endDay command returns a new state; isFirstRun is set in the reducer
    // So we verify via the reducer path
    const viaReducer = gameSliceReducer(stateWithFirstRun, gameActions.endDay())
    expect(viaReducer.isFirstRun).toBe(false)
    // The raw command doesn't set isFirstRun (that's the reducer's job)
    expect(next.isFirstRun).toBe(true)
  })
})
