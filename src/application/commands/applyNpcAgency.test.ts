import { describe, expect, it } from 'vitest'
import { applyAllNpcAgency } from './npcAgency'
import { applyInitiativeAgency } from './npcAgency/initiativeAgency'
import { initialStateWithIda } from './testFixtures'
import { createRng } from './seededRng'
import type { NpcRuntimeState } from '../../domain'

describe('applyAllNpcAgency (refactored from applyNpcAgency)', () => {
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

  it('different seeds may produce different outcomes', () => {
    const state = {
      ...initialStateWithIda,
      // Both NPCs working maximises agency event chances (15% per NPC per day)
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) => ({ ...npc, assignment: 'working' as const })),
    }

    // Run many seeds to confirm at least one differs (confirms rng is wired)
    let sawDifference = false
    for (let seed = 0; seed < 50; seed++) {
      const r1 = applyAllNpcAgency(state, createRng(seed).rng)
      const r2 = applyAllNpcAgency(state, createRng(seed + 1000).rng)
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
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) => ({ ...npc, assignment: 'idle' as const })),
    }
    const logBefore = state.activityLog.length

    // Even with a seed that would trigger action (rng always returns 0 = below 0.15 threshold)
    const alwaysTrigger = () => 0
    const result = applyAllNpcAgency(state, alwaysTrigger)

    expect(result.activityLog.length).toBe(logBefore)
  })
})

describe('applyInitiativeAgency (refactored from applyInitiativeAgency)', () => {
  function makeInitiatorNpc(): NpcRuntimeState {
    return {
      ...initialStateWithIda.npcRuntimeStates[0]!,
      npcId: 'npc-nessa-test',
      name: 'Nessa Test',
      traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, ambition: 80, dominance: 65 },
      npcArc: { arcId: 'arc-initiator', stage: 'active', stageEnteredDay: 0, stageFlags: {}, driftHistory: [] },
    }
  }

  it('does nothing when day is not divisible by 7', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 6, npcRuntimeStates: [nessa] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeAgency(state, () => 0)
    expect(result.activityLog.length).toBe(logBefore)
  })

  it('fires an initiative action on day divisible by 7', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, npcRuntimeStates: [nessa] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeAgency(state, () => 0)
    expect(result.activityLog.length).toBeGreaterThan(logBefore)
  })

  it('records initiative in stageFlags', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, npcRuntimeStates: [nessa] }
    const result = applyInitiativeAgency(state, () => 0)
    const updated = result.npcRuntimeStates.find((n: { npcId: string }) => n.npcId === nessa.npcId)!
    expect(updated.npcArc!.stageFlags[`initiative-7`]).toBe(true)
  })

  it('resource_move adds money to house funds when selected', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, money: 50, npcRuntimeStates: [nessa] }
    // Force resource_move by controlling RNG calls
    let callCount = 0
    const forceResourceMove = () => {
      callCount++
      if (callCount === 1) return 0 // selects pool[0] = 'resource_move'
      if (callCount === 2) return 0.5 // district index
      return 0.5 // amount calculation
    }
    const result = applyInitiativeAgency(state, forceResourceMove)
    // resource_move adds 15-40 marks (15 + floor(0-25))
    expect(result.money).toBeGreaterThan(50)
    // prosperity dial increases by 1
    expect(result.cityDials.prosperity).toBe(state.cityDials.prosperity + 1)
  })

  it('does nothing for NPCs without arc-initiator', () => {
    const npcNoArc = { ...initialStateWithIda.npcRuntimeStates[0]!, npcArc: null }
    const state = { ...initialStateWithIda, day: 7, npcRuntimeStates: [npcNoArc] }
    const logBefore = state.activityLog.length
    const result = applyInitiativeAgency(state, () => 0)
    expect(result.activityLog.length).toBe(logBefore)
  })
})
