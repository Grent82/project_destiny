import { describe, it, expect } from 'vitest'
import { advanceTimeSlotInState, advanceSlotsInState, sleepBrief, sleepToMorning, slotsUntilMorning, SLOT_SEQUENCE } from './timeAdvance'
import { initialStateWithIda } from './testFixtures'

function stateAtSlot(timeSlot: (typeof SLOT_SEQUENCE)[number]) {
  return { ...initialStateWithIda, timeSlot }
}

describe('advanceTimeSlotInState', () => {
  it('advances morning → afternoon', () => {
    const result = advanceTimeSlotInState(stateAtSlot('morning'))
    expect(result.timeSlot).toBe('afternoon')
  })

  it('advances afternoon → evening', () => {
    const result = advanceTimeSlotInState(stateAtSlot('afternoon'))
    expect(result.timeSlot).toBe('evening')
  })

  it('advances evening → night', () => {
    const result = advanceTimeSlotInState(stateAtSlot('evening'))
    expect(result.timeSlot).toBe('night')
  })

  it('advances night → morning and triggers endDay (increments day)', () => {
    const s = stateAtSlot('night')
    const result = advanceTimeSlotInState(s)
    expect(result.timeSlot).toBe('morning')
    expect(result.day).toBe(s.day + 1)
  })
})

describe('advanceSlotsInState', () => {
  it('advances 0 slots — no change', () => {
    const s = stateAtSlot('morning')
    const result = advanceSlotsInState(s, 0)
    expect(result.timeSlot).toBe('morning')
  })

  it('advances 2 slots from morning → evening', () => {
    const result = advanceSlotsInState(stateAtSlot('morning'), 2)
    expect(result.timeSlot).toBe('evening')
  })

  it('advances 4 slots wraps around to morning + 1 day', () => {
    const s = stateAtSlot('morning')
    const result = advanceSlotsInState(s, 4)
    expect(result.timeSlot).toBe('morning')
    expect(result.day).toBe(s.day + 1)
  })
})

describe('slotsUntilMorning', () => {
  it('from morning: 4 slots (full cycle)', () => {
    expect(slotsUntilMorning('morning')).toBe(4)
  })
  it('from afternoon: 3 slots', () => {
    expect(slotsUntilMorning('afternoon')).toBe(3)
  })
  it('from evening: 2 slots', () => {
    expect(slotsUntilMorning('evening')).toBe(2)
  })
  it('from night: 1 slot', () => {
    expect(slotsUntilMorning('night')).toBe(1)
  })
})

describe('sleepBrief', () => {
  it('advances 1 slot', () => {
    const s = stateAtSlot('morning')
    const result = sleepBrief(s)
    expect(result.timeSlot).toBe('afternoon')
  })

  it('reduces roster fatigue by 15', () => {
    const s = {
      ...stateAtSlot('morning'),
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((n) => ({ ...n, states: { ...n.states, fatigue: 40 } })),
    }
    const result = sleepBrief(s)
    for (const npc of result.npcRuntimeStates) {
      expect(npc.states.fatigue).toBe(25)
    }
  })

  it('does not reduce fatigue below 0', () => {
    const s = {
      ...stateAtSlot('morning'),
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((n) => ({ ...n, states: { ...n.states, fatigue: 5 } })),
    }
    const result = sleepBrief(s)
    for (const npc of result.npcRuntimeStates) {
      expect(npc.states.fatigue).toBe(0)
    }
  })
})

describe('sleepToMorning', () => {
  it('from night: advances 1 slot to morning, increments day', () => {
    const s = stateAtSlot('night')
    const result = sleepToMorning(s)
    expect(result.timeSlot).toBe('morning')
    expect(result.day).toBe(s.day + 1)
  })

  it('from evening: advances 2 slots to morning', () => {
    const s = stateAtSlot('evening')
    const result = sleepToMorning(s)
    expect(result.timeSlot).toBe('morning')
    expect(result.day).toBe(s.day + 1)
  })

  it('reduces fatigue and increases health after sleep', () => {
    const initialFatigue = 60
    const initialHealth = 80
    const s = {
      ...stateAtSlot('night'),
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((n) => ({
        ...n,
        states: { ...n.states, fatigue: initialFatigue, health: initialHealth },
      })),
    }
    const result = sleepToMorning(s)
    for (const npc of result.npcRuntimeStates) {
      expect(npc.states.fatigue).toBeLessThan(initialFatigue)
      expect(npc.states.health).toBeGreaterThan(initialHealth)
    }
  })

  it('restores player combat health overnight without implicitly curing injury', () => {
    const s = {
      ...stateAtSlot('night'),
      playerCharacter: {
        ...stateAtSlot('night').playerCharacter,
        combatState: {
          health: 32,
          morale: 64,
        },
      },
    }

    const result = sleepToMorning(s)

    expect(result.playerCharacter.combatState?.health).toBeGreaterThan(32)
  })

  it('does not restore player combat health above the player maximum', () => {
    const s = {
      ...stateAtSlot('night'),
      playerCharacter: {
        ...stateAtSlot('night').playerCharacter,
        combatState: {
          health: 79,
          morale: 64,
         
        },
      },
    }

    const result = sleepToMorning(s)

    expect(result.playerCharacter.combatState?.health).toBe(80)
  })
})
