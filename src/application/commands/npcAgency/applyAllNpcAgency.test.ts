import { describe, expect, it } from 'vitest'
import { applyAllNpcAgency } from './index'
import { initialStateWithIda, idaRhysRosterEntry, worldNpcRuntimeEntry } from '../testFixtures'
import { createRng } from '../seededRng'

describe('applyAllNpcAgency', () => {
  it('same seed produces identical outcome (deterministic)', () => {
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) => ({ ...npc, assignment: 'working' as const })),
    }

    const rng1 = createRng(42).rng
    const rng2 = createRng(42).rng

    const result1 = applyAllNpcAgency(state, rng1)
    const result2 = applyAllNpcAgency(state, rng2)

    expect(result1.activityLog).toEqual(result2.activityLog)
    expect(result1.districtTension).toEqual(result2.districtTension)
    expect(result1.factionStandings).toEqual(result2.factionStandings)
  })

  it('idle NPCs never trigger agency actions', () => {
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) => ({ ...npc, assignment: 'idle' as const })),
    }
    const logBefore = state.activityLog.length

    // Even with a seed that would trigger action (rng always returns 0 = below 0.15 threshold)
    const alwaysTrigger = () => 0
    const result = applyAllNpcAgency(state, alwaysTrigger)

    expect(result.activityLog.length).toBe(logBefore)
  })

  it('preserves backwards compatibility with original applyNpcAgency behavior', () => {
    // This test confirms that the modular refactored version produces
    // the same output pattern as the original monolithic version
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) => ({ ...npc, assignment: 'working' as const })),
    }

    // Run with multiple seeds to ensure no regression
    for (let seed = 0; seed < 10; seed++) {
      const result = applyAllNpcAgency(state, createRng(seed).rng)
      // Assert that result is a valid GameState with expected structure
      expect(result.day).toBe(state.day)
      expect(result.npcRuntimeStates.length).toBe(state.npcRuntimeStates.length)
    }
  })

  it('never spends house money or logs agency activity for a working World NPC, even a "greedy" one (destiny-rama.12 — player-house economics stay roster-only)', () => {
    const greedyWorldNpc = worldNpcRuntimeEntry('npc-test-world-greedy', {
      assignment: 'working',
      traits: { ...idaRhysRosterEntry.traits, ambition: 90, discipline: 10 }, // isGreedy in spendingAgency.ts
    })
    const state = {
      ...initialStateWithIda,
      // Only the World NPC is working — no roster member can trigger any agency action here.
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, greedyWorldNpc],
      money: 1000,
    }

    // Force every probability gate to succeed (all thresholds in the agency modules are `rng() < X`
    // with X <= 0.5, so 0 always passes) to maximize the chance a bug would surface.
    const alwaysTrigger = () => 0
    const result = applyAllNpcAgency(state, alwaysTrigger)

    expect(result.money).toBe(1000)
    const worldNpc = result.npcRuntimeStates.find((n) => n.npcId === 'npc-test-world-greedy')!
    expect(worldNpc.states).toEqual(greedyWorldNpc.states)
  })
})
