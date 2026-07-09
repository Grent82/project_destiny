import { describe, it, expect } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from '../commands/testFixtures'
import { ROOM_IDS } from '../content/ids/roomIds'
import { PLAYER_MAX_HEALTH } from '../commands/combatants'
import { selectNpcRecoveryStatus, selectPlayerRecoveryStatus, selectPlayerIsWounded } from './recoveryStatus'

function storeWithIda(overrides: Partial<typeof idaRhysRosterEntry> = {}) {
  return createGameStore({
    ...initialGameStateSnapshot,
    npcRuntimeStates: [
      ...initialGameStateSnapshot.npcRuntimeStates,
      {
        ...idaRhysRosterEntry,
        ...overrides,
        states: { ...idaRhysRosterEntry.states, ...(overrides.states ?? {}) },
      },
    ],
  })
}

/** Marks an existing house room intact with the given function, leaving all its other fields untouched. */
function houseWithIntactRoom(roomId: string, roomFunction: 'quarters' | 'infirmary') {
  return {
    ...initialGameStateSnapshot.house,
    rooms: initialGameStateSnapshot.house.rooms.map((r) =>
      r.roomId === roomId ? { ...r, state: 'intact' as const, roomFunction } : r,
    ),
  }
}

const RESIDENTIAL_ROOM_IDS = [ROOM_IDS.QUARTERS, ROOM_IDS.MASTER_CHAMBER, ROOM_IDS.SERVANT_QUARTERS, ROOM_IDS.BARRACKS, ROOM_IDS.EAST_WING]

/** room-quarters is intact by default in the initial save — ruin all residential rooms so the player has no lodging support. */
function houseWithNoResidentialSupport() {
  return {
    ...initialGameStateSnapshot.house,
    rooms: initialGameStateSnapshot.house.rooms.map((r) =>
      RESIDENTIAL_ROOM_IDS.includes(r.roomId as typeof ROOM_IDS.QUARTERS) ? { ...r, state: 'damaged' as const } : r,
    ),
  }
}

describe('selectNpcRecoveryStatus', () => {
  it('reports ready for a healthy, non-recovering NPC', () => {
    const store = storeWithIda()
    const result = selectNpcRecoveryStatus(idaRhysRosterEntry.npcId)(store.getState())
    expect(result.ready).toBe(true)
  })

  it('describes a seriously injured NPC with no support as slow and unsupported', () => {
    const store = storeWithIda({
      assignment: 'recovering',
      states: { ...idaRhysRosterEntry.states, health: 50},
    })
    const result = selectNpcRecoveryStatus(idaRhysRosterEntry.npcId)(store.getState())
    expect(result.ready).toBe(false)
    expect(result.supportLabel).toMatch(/no real treatment/i)
    expect(result.statusMessage).toMatch(/slow without an infirmary or medic/i)
  })

  it('describes a seriously injured NPC with lodging but no treatment', () => {
    const store = storeWithIda({
      assignment: 'recovering',
      roomAssignment: ROOM_IDS.QUARTERS,
      states: { ...idaRhysRosterEntry.states, health: 50},
    })
    store.dispatch({
      type: 'game/replaceGameState',
      payload: { ...store.getState().game, house: houseWithIntactRoom(ROOM_IDS.QUARTERS, 'quarters') },
    })
    const result = selectNpcRecoveryStatus(idaRhysRosterEntry.npcId)(store.getState())
    expect(result.ready).toBe(false)
    expect(result.supportLabel).toMatch(/proper quarters/i)
    expect(result.statusMessage).toMatch(/real treatment.*would speed recovery/i)
  })

  it('describes a seriously injured NPC with infirmary treatment as progressing steadily', () => {
    const store = storeWithIda({
      assignment: 'recovering',
      states: { ...idaRhysRosterEntry.states, health: 50},
    })
    store.dispatch({
      type: 'game/replaceGameState',
      payload: { ...store.getState().game, house: houseWithIntactRoom(ROOM_IDS.VAULT, 'infirmary') },
    })
    const result = selectNpcRecoveryStatus(idaRhysRosterEntry.npcId)(store.getState())
    expect(result.ready).toBe(false)
    expect(result.supportLabel).toMatch(/infirmary care/i)
    expect(result.statusMessage).toMatch(/progressing steadily/i)
  })

  it('still reports a non-generic message once health is capped but health remains above the ready threshold (silent-stall regression)', () => {
    const store = storeWithIda({
      assignment: 'recovering',
      states: { ...idaRhysRosterEntry.states, health: 100 },
    })
    const result = selectNpcRecoveryStatus(idaRhysRosterEntry.npcId)(store.getState())
    expect(result.ready).toBe(false)
    expect(result.statusMessage.length).toBeGreaterThan(0)
    expect(result.statusMessage).not.toMatch(/^Health improving\.?$/i)
  })
})

describe('selectPlayerRecoveryStatus / selectPlayerIsWounded', () => {
  it('is not wounded at full health with no injury', () => {
    const store = createGameStore(initialGameStateSnapshot)
    expect(selectPlayerIsWounded(store.getState())).toBe(false)
  })

  it('is wounded and unsupported when injured with no house support', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      house: houseWithNoResidentialSupport(),
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        combatState: { health: PLAYER_MAX_HEALTH - 20, morale: 70 },
      },
    })
    expect(selectPlayerIsWounded(store.getState())).toBe(true)
    const result = selectPlayerRecoveryStatus(store.getState())
    expect(result.ready).toBe(false)
    expect(result.supportLabel).toMatch(/no real treatment/i)
  })

  it('describes treated player recovery when the house has an infirmary', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      house: houseWithIntactRoom(ROOM_IDS.VAULT, 'infirmary'),
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        combatState: { health: PLAYER_MAX_HEALTH - 20, morale: 70},
      },
    })
    const result = selectPlayerRecoveryStatus(store.getState())
    expect(result.supportLabel).toMatch(/infirmary care/i)
  })
})
