import { describe, expect, it } from 'vitest'
import { applyInitiativeAgency } from './initiativeAgency'
import { initialStateWithIda } from '../testFixtures'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'

describe('applyInitiativeAgency', () => {
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
    const updated = result.npcRuntimeStates.find((n) => n.npcId === nessa.npcId)!
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

  it('deterministic: same seed produces identical outcome', () => {
    const nessa = makeInitiatorNpc()
    const state = { ...initialStateWithIda, day: 7, npcRuntimeStates: [nessa] }

    const result1 = applyInitiativeAgency(state, () => 0.1)
    const result2 = applyInitiativeAgency(state, () => 0.1)

    expect(result1.activityLog).toEqual(result2.activityLog)
    expect(result1.money).toBe(result2.money)
  })
})
