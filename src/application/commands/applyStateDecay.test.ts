import { describe, it, expect } from 'vitest'
import { applyStateDecay } from './applyStateDecay'
import { initialStateWithIda, idaRhysRosterEntry, worldNpcRuntimeEntry } from './testFixtures'
import type { RoomFunction } from '../../domain/game/contracts'

function withRoom(state: typeof initialStateWithIda, roomId: string, fn: RoomFunction) {
  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((r) =>
        r.roomId === roomId ? { ...r, state: 'intact' as const, roomFunction: fn } : r,
      ),
    },
  }
}

describe('house room function bonuses', () => {
  const recoveringNpcId = 'npc-ida-rhys'

  function stateWithRecoveringIda(health = 40) {
    return {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === recoveringNpcId
          ? { ...npc, assignment: 'recovering' as const, states: { ...npc.states, health } }
          : npc,
      ),
    }
  }

  describe('infirmary', () => {
    it('adds +3 health recovery per day for recovering NPCs', () => {
      const baseState = stateWithRecoveringIda(40)
      const withInfirmary = withRoom(baseState, 'room-bureau', 'infirmary')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withInfirmary)

      const idaBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)

      expect(idaBonus!.states.health).toBeGreaterThan(idaBaseline!.states.health)
    })

    it('does not boost non-recovering NPCs', () => {
      const marionId = 'npc-marion-vale'
      const baseState = stateWithRecoveringIda(40)
      const withInfirmary = withRoom(baseState, 'room-bureau', 'infirmary')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withInfirmary)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.health).toBe(marionBaseline!.states.health)
    })

    it('does not apply when infirmary room is not intact', () => {
      const baseState = stateWithRecoveringIda(40)
      const damagedInfirmary = {
        ...baseState,
        house: {
          ...baseState.house,
          rooms: baseState.house.rooms.map((r) =>
            r.roomId === 'room-bureau'
              ? { ...r, state: 'damaged' as const, roomFunction: 'infirmary' as const }
              : r,
          ),
        },
      }

      const baseline = applyStateDecay(baseState)
      const damaged = applyStateDecay(damagedInfirmary)

      const idaBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)
      const idaDamaged = damaged.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)

      expect(idaDamaged!.states.health).toBe(idaBaseline!.states.health)
    })
  })

  describe('kitchen', () => {
    it('reduces hunger accumulation by 3/day for resting NPCs', () => {
      const marionId = 'npc-marion-vale'
      const withKitchen = withRoom(initialStateWithIda, 'room-kitchen', 'kitchen')

      const baseline = applyStateDecay(initialStateWithIda)
      const withBonus = applyStateDecay(withKitchen)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.hunger).toBeLessThan(marionBaseline!.states.hunger)
    })

    it('applies kitchen bonus to recovering NPCs too', () => {
      const baseState = stateWithRecoveringIda(40)
      const withKitchen = withRoom(baseState, 'room-kitchen', 'kitchen')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withKitchen)

      const idaBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)

      expect(idaBonus!.states.hunger).toBeLessThanOrEqual(idaBaseline!.states.hunger)
    })
  })

  describe('barracks', () => {
    it('accelerates fatigue recovery by 2/day for idle NPCs', () => {
      const marionId = 'npc-marion-vale'
      const fatiguedState = {
        ...initialStateWithIda,
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId
            ? { ...npc, states: { ...npc.states, fatigue: 20 } }
            : npc,
        ),
      }
      const withBarracks = withRoom(fatiguedState, 'room-garret', 'barracks')

      const baseline = applyStateDecay(fatiguedState)
      const withBonus = applyStateDecay(withBarracks)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.fatigue).toBeLessThan(marionBaseline!.states.fatigue)
    })

    it('does not apply barracks bonus to recovering NPCs', () => {
      const baseState = stateWithRecoveringIda(40)
      const withBarracks = withRoom(baseState, 'room-garret', 'barracks')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withBarracks)

      const idaBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === recoveringNpcId)

      // Recovering NPCs don't get barracks fatigue bonus
      expect(idaBonus!.states.fatigue).toBe(idaBaseline!.states.fatigue)
    })
  })

  describe('recovering NPC log visibility (silent-stall regression)', () => {
    it('still logs a recovery update once health is capped but injury remains above the ready threshold', () => {
      const state = {
        ...initialStateWithIda,
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === recoveringNpcId
            ? { ...npc, assignment: 'recovering' as const, states: { ...npc.states, health: 100, injury: 20 } }
            : npc,
        ),
      }

      const result = applyStateDecay(state)

      expect(result.activityLog[0]?.message).not.toMatch(/^.*is recovering\. Health improving\.$/)
      expect(result.activityLog[0]?.message).toMatch(/still recovering/i)
    })
  })

  describe('study', () => {
    it('accelerates stress recovery by 1/day for idle NPCs', () => {
      const marionId = 'npc-marion-vale'
      // Give Marion some stress to recover from
      const stressedState = {
        ...initialStateWithIda,
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId
            ? { ...npc, states: { ...npc.states, stress: 40 } }
            : npc,
        ),
      }
      const withStudy = withRoom(stressedState, 'room-study', 'study')

      const baseline = applyStateDecay(stressedState)
      const withBonus = applyStateDecay(withStudy)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.stress).toBeLessThan(marionBaseline!.states.stress)
    })
  })

  describe('quarters', () => {
    it('reduces fatigue and improves morale for resting NPCs with assigned residential quarters', () => {
      const marionId = 'npc-marion-vale'
      const housedState = {
        ...initialStateWithIda,
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId
            ? {
                ...npc,
                roomAssignment: 'room-quarters',
                states: { ...npc.states, fatigue: 20, morale: 60 },
              }
            : npc,
        ),
        house: {
          ...initialStateWithIda.house,
          rooms: initialStateWithIda.house.rooms.map((room) =>
            room.roomId === 'room-quarters'
              ? { ...room, state: 'intact' as const }
              : room,
          ),
        },
      }

      const baseline = applyStateDecay({
        ...housedState,
        npcRuntimeStates: housedState.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId ? { ...npc, roomAssignment: null } : npc,
        ),
      })
      const withBonus = applyStateDecay(housedState)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.fatigue).toBeLessThan(marionBaseline!.states.fatigue)
      expect(marionBonus!.states.morale).toBeGreaterThan(marionBaseline!.states.morale)
    })

    it('keeps quarters lodging and a kitchen duty post independent — an NPC can have both at once', () => {
      const marionId = 'npc-marion-vale'
      const housedAndWorkingState = {
        ...initialStateWithIda,
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId
            ? {
                ...npc,
                assignment: 'working' as const,
                roomAssignment: 'room-quarters',
                dutyPostRoomId: 'room-kitchen',
                states: { ...npc.states, fatigue: 20, morale: 60 },
              }
            : npc,
        ),
        house: {
          ...initialStateWithIda.house,
          rooms: initialStateWithIda.house.rooms.map((room) =>
            room.roomId === 'room-quarters' || room.roomId === 'room-kitchen'
              ? { ...room, state: 'intact' as const }
              : room,
          ),
        },
      }

      const result = applyStateDecay(housedAndWorkingState)
      const marion = result.npcRuntimeStates.find((n) => n.npcId === marionId)

      // Quarters lodging bonus still applies even though the NPC also holds a duty post.
      expect(marion!.states.fatigue).toBeLessThan(20)
      expect(marion!.states.morale).toBeGreaterThan(60)
      // Both fields survive independently — assigning a duty post did not clear quarters.
      expect(marion!.roomAssignment).toBe('room-quarters')
      expect(marion!.dutyPostRoomId).toBe('room-kitchen')
    })

    it('does not treat non-residential assignments like bureau as quarters', () => {
      const marionId = 'npc-marion-vale'
      const bureauAssignedState = {
        ...initialStateWithIda,
        house: {
          ...initialStateWithIda.house,
          rooms: initialStateWithIda.house.rooms.map((room) =>
            room.roomId === 'room-bureau'
              ? { ...room, state: 'intact' as const }
              : room,
          ),
        },
        npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId
            ? {
                ...npc,
                roomAssignment: 'room-bureau',
                states: { ...npc.states, fatigue: 20, morale: 60 },
              }
            : npc,
        ),
      }

      const baseline = applyStateDecay({
        ...bureauAssignedState,
        npcRuntimeStates: bureauAssignedState.npcRuntimeStates.map((npc) =>
          npc.npcId === marionId ? { ...npc, roomAssignment: null } : npc,
        ),
      })
      const withAssignment = applyStateDecay(bureauAssignedState)

      const marionBaseline = baseline.npcRuntimeStates.find((n) => n.npcId === marionId)
      const marionAssigned = withAssignment.npcRuntimeStates.find((n) => n.npcId === marionId)

      expect(marionAssigned!.states.fatigue).toBe(marionBaseline!.states.fatigue)
      expect(marionAssigned!.states.morale).toBe(marionBaseline!.states.morale)
    })
  })
})

describe('player rest', () => {
  function stateWithPlayerInjury(health: number, injury: number) {
    return {
      ...initialStateWithIda,
      playerCharacter: {
        ...initialStateWithIda.playerCharacter,
        combatState: { health, morale: 64, injury },
      },
    }
  }

  function withNoResidentialRooms(state: typeof initialStateWithIda) {
    return {
      ...state,
      house: {
        ...state.house,
        rooms: state.house.rooms.map((room) => ({ ...room, state: 'stripped' as const })),
      },
    }
  }

  it('gives a small health gain with no lodging or treatment support', () => {
    const state = withNoResidentialRooms(stateWithPlayerInjury(50, 0))
    const result = applyStateDecay(state)

    expect(result.playerCharacter.combatState?.health).toBe(53)
    expect(result.playerCharacter.combatState?.injury).toBe(0)
  })

  it('gives a larger health gain when intact quarters are available', () => {
    const state = stateWithPlayerInjury(50, 0) // initialStateWithIda has intact room-quarters by default
    const result = applyStateDecay(state)

    expect(result.playerCharacter.combatState?.health).toBe(55)
    expect(result.playerCharacter.combatState?.injury).toBe(0)
  })

  it('reduces injury and gives the largest health gain with infirmary and medic support while seriously injured', () => {
    const state = withRoom(stateWithPlayerInjury(50, 32), 'room-bureau', 'infirmary')
    const withMedic = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-medic' } : npc,
      ),
    }
    const result = applyStateDecay(withMedic)

    expect(result.playerCharacter.combatState?.health).toBe(60)
    expect(result.playerCharacter.combatState?.injury).toBe(27)
  })

  it('does not reduce injury from infirmary/medic support when the player is not seriously injured', () => {
    const state = withRoom(stateWithPlayerInjury(50, 10), 'room-bureau', 'infirmary')
    const withMedic = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-medic' } : npc,
      ),
    }
    const result = applyStateDecay(withMedic)

    expect(result.playerCharacter.combatState?.injury).toBe(10)
  })

  it('does not restore health above the player maximum', () => {
    const state = stateWithPlayerInjury(79, 0)
    const result = applyStateDecay(state)

    expect(result.playerCharacter.combatState?.health).toBe(80)
  })

  it('logs a player-facing rest message describing the house support received', () => {
    const state = stateWithPlayerInjury(50, 0)
    const result = applyStateDecay(state)

    expect(result.activityLog[0]?.message).toMatch(/quarters/i)
  })

  it('does not log or change anything when the player is already fully healthy', () => {
    const state = stateWithPlayerInjury(80, 0)
    const result = applyStateDecay(state)

    expect(result.activityLog).toEqual(state.activityLog)
  })
})

describe('World NPC recovery (destiny-629x scaffolding, folded into the unified list in destiny-rama.8)', () => {
  const recoveringWorldNpcId = 'npc-scaffolding-test-world-npc'

  function stateWithRecoveringWorldNpc(health: number, injury: number) {
    return {
      ...initialStateWithIda,
      npcRuntimeStates: [
        ...initialStateWithIda.npcRuntimeStates,
        worldNpcRuntimeEntry(recoveringWorldNpcId, {
          assignment: 'recovering',
          states: { ...idaRhysRosterEntry.states, health, injury },
        }),
      ],
    }
  }

  it('regains health and sheds injury each day, same math as roster NPCs with no support', () => {
    const state = stateWithRecoveringWorldNpc(50, 40)
    const result = applyStateDecay(state)

    const worldNpc = result.npcRuntimeStates.find((w) => w.npcId === recoveringWorldNpcId)
    expect(worldNpc!.states.health).toBeGreaterThan(50)
    expect(worldNpc!.states.injury).toBeLessThan(40)
    expect(worldNpc!.assignment).toBe('recovering')
  })

  it('gets infirmary treatment the same way roster NPCs do', () => {
    const baseState = stateWithRecoveringWorldNpc(50, 40)
    const withInfirmary = withRoom(baseState, 'room-bureau', 'infirmary')

    const baseline = applyStateDecay(baseState)
    const withBonus = applyStateDecay(withInfirmary)

    const baselineNpc = baseline.npcRuntimeStates.find((w) => w.npcId === recoveringWorldNpcId)
    const bonusNpc = withBonus.npcRuntimeStates.find((w) => w.npcId === recoveringWorldNpcId)

    expect(bonusNpc!.states.injury).toBeLessThan(baselineNpc!.states.injury)
  })

  it('flips assignment back to idle once health and injury both clear the ready threshold', () => {
    const state = stateWithRecoveringWorldNpc(90, 10)
    const result = applyStateDecay(state)

    const worldNpc = result.npcRuntimeStates.find((w) => w.npcId === recoveringWorldNpcId)
    expect(worldNpc!.assignment).toBe('idle')
  })

  it('does not apply the recovery-boost health/injury changes to a non-recovering World NPC', () => {
    const state: typeof initialStateWithIda = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, worldNpcRuntimeEntry('npc-idle-test-world-npc')],
    }
    const result = applyStateDecay(state)

    const worldNpc = result.npcRuntimeStates.find((w) => w.npcId === 'npc-idle-test-world-npc')
    // Step 1's baseline hunger/fatigue/etc. decay now runs over every person in the unified list
    // (destiny-rama.8 fold) — that's the "full needs parity" the unify epic exists to deliver
    // (destiny-rama.12 tunes it further). Only the recovery-specific boost (Step 2b) must stay
    // gated to assignment === 'recovering'.
    expect(worldNpc!.assignment).toBe('idle')
    expect(worldNpc!.states.health).toBe(idaRhysRosterEntry.states.health)
    expect(worldNpc!.states.injury).toBe(idaRhysRosterEntry.states.injury)
  })
})

describe('full needs-decay parity for world/story persons (destiny-rama.12)', () => {
  it("a World NPC's hunger rises over an endDay-style applyStateDecay call, same as a roster NPC", () => {
    const worldNpc = worldNpcRuntimeEntry('npc-test-world-hunger', { states: { ...idaRhysRosterEntry.states, hunger: 20 } })
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, worldNpc],
    }
    const result = applyStateDecay(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-test-world-hunger')!
    expect(npc.states.hunger).toBeGreaterThan(20)
  })

  it('excludes npcType:enemy persons from decay entirely — states are byte-for-byte unchanged', () => {
    const enemyNpc = {
      ...worldNpcRuntimeEntry('npc-test-enemy-decay'),
      npcType: 'enemy' as const,
    }
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, enemyNpc],
    }
    const result = applyStateDecay(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-test-enemy-decay')!
    expect(npc.states).toEqual(enemyNpc.states)
    expect(npc.assignment).toBe(enemyNpc.assignment)
  })

  it('a captive person still accumulates survival needs (hunger) alongside their separate custody state — not double-decayed, not skipped', () => {
    const captiveNpc = worldNpcRuntimeEntry('npc-test-captive-decay', {
      states: { ...idaRhysRosterEntry.states, hunger: 20, stress: 40 },
      captivityState: {
        status: 'captive', holderId: 'faction-gilded-court', siteId: 'site-poi-pale-old-tannery',
        roomId: 'tannery-inner-ring', regime: 'guarded', condition: 'hurt', compliance: 'resistant',
        bondType: 'fear', timeHeldDays: 5, lastTransferDay: null, questTag: null,
        confiscatedItems: [], confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, captiveNpc],
    }
    const result = applyStateDecay(state)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-test-captive-decay')!
    // Survival needs still accumulate exactly once (Step 1's single pass) — a captive still gets
    // hungry. Their captivityState (a separate concern, driven by dedicated custody commands, not
    // applyStateDecay) is untouched by this function.
    expect(npc.states.hunger).toBeGreaterThan(20)
    expect(npc.captivityState).toEqual(captiveNpc.captivityState)
  })
})
