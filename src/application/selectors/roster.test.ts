import { describe, it, expect } from 'vitest'
import { computeWorkingIncome, selectRosterDetail, selectRosterEntries } from './roster'
import { createGameStore } from '../store/gameStore'

describe('selectRosterEntries', () => {
  it('excludes world/story/enemy persons sharing the unified runtime list (destiny-rama.8)', () => {
    // The base save now hydrates 3 non-player-roster persons (Mira's custody handler + 2 guards)
    // into the same npcRuntimeStates array as Marion Vale (see data/runtime/initial-game-state.json).
    // selectRosterEntries must show only the player's own roster, not the whole population.
    const store = createGameStore()
    const entries = selectRosterEntries(store.getState())
    expect(entries.map((e) => e.npcId)).toEqual(['npc-marion-vale'])
    expect(entries.some((e) => e.npcId === 'npc-dalen-morke')).toBe(false)
  })
})

describe('selectRosterDetail isPrimary/hasHouseSeal (destiny-zxzz)', () => {
  it('reads isPrimary and hasHouseSeal from the NPC definition for Marion Vale', () => {
    const store = createGameStore()
    const detail = selectRosterDetail(store.getState(), 'npc-marion-vale')
    expect(detail?.isPrimary).toBe(true)
    expect(detail?.hasHouseSeal).toBe(true)
  })

  it('defaults isPrimary and hasHouseSeal to false for an NPC without those flags authored', () => {
    const store = createGameStore()
    const detail = selectRosterDetail(store.getState(), 'npc-dalen-morke')
    expect(detail?.isPrimary).toBe(false)
    expect(detail?.hasHouseSeal).toBe(false)
  })
})

describe('computeWorkingIncome', () => {
  it('returns minimum 3 when all skills are zero', () => {
    expect(computeWorkingIncome({})).toBe(3)
  })

  it('scales with best non-combat skill', () => {
    expect(computeWorkingIncome({ administration: 70 })).toBe(10)
  })

  it('caps at 15 regardless of skill level', () => {
    expect(computeWorkingIncome({ negotiation: 100 })).toBe(14)
  })

  it('ignores combat skills', () => {
    expect(computeWorkingIncome({ melee: 100, ranged: 100 })).toBe(3)
  })

  it('picks the highest working skill when multiple are present', () => {
    const low = computeWorkingIncome({ administration: 21, engineering: 42 })
    const high = computeWorkingIncome({ administration: 42 })
    expect(low).toBe(high)
  })
})
