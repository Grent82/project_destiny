import { describe, it, expect } from 'vitest'
import { applyStateDecay } from './applyStateDecay'
import { initialStateWithIda } from './testFixtures'
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
      roster: initialStateWithIda.roster.map((npc) =>
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

      const idaBaseline = baseline.roster.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.roster.find((n) => n.npcId === recoveringNpcId)

      expect(idaBonus!.states.health).toBeGreaterThan(idaBaseline!.states.health)
    })

    it('does not boost non-recovering NPCs', () => {
      const marionId = 'npc-marion-vale'
      const baseState = stateWithRecoveringIda(40)
      const withInfirmary = withRoom(baseState, 'room-bureau', 'infirmary')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withInfirmary)

      const marionBaseline = baseline.roster.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.roster.find((n) => n.npcId === marionId)

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

      const idaBaseline = baseline.roster.find((n) => n.npcId === recoveringNpcId)
      const idaDamaged = damaged.roster.find((n) => n.npcId === recoveringNpcId)

      expect(idaDamaged!.states.health).toBe(idaBaseline!.states.health)
    })
  })

  describe('kitchen', () => {
    it('reduces hunger accumulation by 3/day for resting NPCs', () => {
      const marionId = 'npc-marion-vale'
      const withKitchen = withRoom(initialStateWithIda, 'room-kitchen', 'kitchen')

      const baseline = applyStateDecay(initialStateWithIda)
      const withBonus = applyStateDecay(withKitchen)

      const marionBaseline = baseline.roster.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.roster.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.hunger).toBeLessThan(marionBaseline!.states.hunger)
    })

    it('applies kitchen bonus to recovering NPCs too', () => {
      const baseState = stateWithRecoveringIda(40)
      const withKitchen = withRoom(baseState, 'room-kitchen', 'kitchen')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withKitchen)

      const idaBaseline = baseline.roster.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.roster.find((n) => n.npcId === recoveringNpcId)

      expect(idaBonus!.states.hunger).toBeLessThanOrEqual(idaBaseline!.states.hunger)
    })
  })

  describe('barracks', () => {
    it('accelerates fatigue recovery by 2/day for idle NPCs', () => {
      const marionId = 'npc-marion-vale'
      const withBarracks = withRoom(initialStateWithIda, 'room-garret', 'barracks')

      const baseline = applyStateDecay(initialStateWithIda)
      const withBonus = applyStateDecay(withBarracks)

      const marionBaseline = baseline.roster.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.roster.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.fatigue).toBeLessThan(marionBaseline!.states.fatigue)
    })

    it('does not apply barracks bonus to recovering NPCs', () => {
      const baseState = stateWithRecoveringIda(40)
      const withBarracks = withRoom(baseState, 'room-garret', 'barracks')

      const baseline = applyStateDecay(baseState)
      const withBonus = applyStateDecay(withBarracks)

      const idaBaseline = baseline.roster.find((n) => n.npcId === recoveringNpcId)
      const idaBonus = withBonus.roster.find((n) => n.npcId === recoveringNpcId)

      // Recovering NPCs don't get barracks fatigue bonus
      expect(idaBonus!.states.fatigue).toBe(idaBaseline!.states.fatigue)
    })
  })

  describe('study', () => {
    it('accelerates stress recovery by 1/day for idle NPCs', () => {
      const marionId = 'npc-marion-vale'
      // Give Marion some stress to recover from
      const stressedState = {
        ...initialStateWithIda,
        roster: initialStateWithIda.roster.map((npc) =>
          npc.npcId === marionId
            ? { ...npc, states: { ...npc.states, stress: 40 } }
            : npc,
        ),
      }
      const withStudy = withRoom(stressedState, 'room-study', 'study')

      const baseline = applyStateDecay(stressedState)
      const withBonus = applyStateDecay(withStudy)

      const marionBaseline = baseline.roster.find((n) => n.npcId === marionId)
      const marionBonus = withBonus.roster.find((n) => n.npcId === marionId)

      expect(marionBonus!.states.stress).toBeLessThan(marionBaseline!.states.stress)
    })
  })
})
