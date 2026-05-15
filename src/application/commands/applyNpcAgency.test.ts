import { describe, expect, it } from 'vitest'
import { applyNpcAgency, applyInitiativeActions } from './applyNpcAgency'
import { initialStateWithIda } from './testFixtures'
import { createRng } from './seededRng'
import type { NpcRuntimeState } from '../../domain'

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

describe('applyInitiativeActions', () => {
  function makeInitiatorNpc(): NpcRuntimeState {
    return {
      ...initialStateWithIda.roster[0]!,
      npcId: 'npc-nessa-test',
      name: 'Nessa Test',
      traits: { ...initialStateWithIda.roster[0]!.traits, ambition: 80, dominance: 65 },
      npcArc: { arcId: 'arc-initiator', stage: 'active', stageEnteredDay: 0, stageFlags: {}, driftHistory: [] },
    }
  }

  it('does nothing when day is not divisible by 7', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 6, roster: [nessa] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeActions(state, () => 0)
    expect(result.activityLog.length).toBe(logBefore)
  })

  it('fires an initiative action on day divisible by 7', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, roster: [nessa] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeActions(state, () => 0)
    expect(result.activityLog.length).toBeGreaterThan(logBefore)
  })

  it('records initiative in stageFlags', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, roster: [nessa] }
    const result = applyInitiativeActions(state, () => 0)
    const updated = result.roster.find((n) => n.npcId === nessa.npcId)!
    expect(updated.npcArc!.stageFlags[`initiative-7`]).toBe(true)
  })

  it('resource_move adds money to house funds when selected', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, money: 100, roster: [nessa] }
    // rng=0: first call selects pool[0] = 'resource_move', subsequent calls fill in amount
    const result = applyInitiativeActions(state, () => 0)
    expect(result.money).toBeGreaterThan(100)
  })

  it('does nothing for NPCs without arc-initiator', () => {
    const npcNoArc = { ...initialStateWithIda.roster[0]!, npcArc: null }
    const state = { ...initialStateWithIda, day: 7, roster: [npcNoArc] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeActions(state, () => 0)
    expect(result.activityLog.length).toBe(logBefore)
  })
})
