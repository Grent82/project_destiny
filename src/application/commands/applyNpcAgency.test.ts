import { describe, expect, it } from 'vitest'
import { applyNpcAgency } from './applyNpcAgency'
import { initialStateWithIda } from './testFixtures'
import { createRng } from './seededRng'

describe('applyNpcAgency', () => {
  it('same seed produces identical outcome (deterministic)', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) => ({ ...npc, assignment: 'working' as const })),
    }

    const rng1 = createRng(42).rng
    const rng2 = createRng(42).rng

    const result1 = applyNpcAgency(state, rng1)
    const result2 = applyNpcAgency(state, rng2)

    expect(result1.activityLog).toEqual(result2.activityLog)
    expect(result1.districtTension).toEqual(result2.districtTension)
    expect(result1.factionStandings).toEqual(result2.factionStandings)
  })

  it('different seeds may produce different outcomes', () => {
    const state = {
      ...initialStateWithIda,
      // Both NPCs working maximises agency event chances (15% per NPC per day)
      roster: initialStateWithIda.roster.map((npc) => ({ ...npc, assignment: 'working' as const })),
    }

    // Run many seeds to confirm at least one differs (confirms rng is wired)
    let sawDifference = false
    for (let seed = 0; seed < 50; seed++) {
      const r1 = applyNpcAgency(state, createRng(seed).rng)
      const r2 = applyNpcAgency(state, createRng(seed + 1000).rng)
      if (r1.activityLog.length !== r2.activityLog.length) {
        sawDifference = true
        break
      }
    }
    // This asserts the rng actually influences the path, not that it always differs
    expect(sawDifference).toBe(true)
  })

  it('idle NPCs never trigger agency actions', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) => ({ ...npc, assignment: 'idle' as const })),
    }
    const logBefore = state.activityLog.length

    // Even with a seed that would trigger action (rng always returns 0 = below 0.15 threshold)
    const alwaysTrigger = () => 0
    const result = applyNpcAgency(state, alwaysTrigger)

    expect(result.activityLog.length).toBe(logBefore)
  })
})
