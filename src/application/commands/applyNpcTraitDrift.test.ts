import { describe, expect, it } from 'vitest'
import { applyNpcTraitDrift } from './applyNpcTraitDrift'
import { initialStateWithIda } from './testFixtures'
import type { NpcRuntimeState } from '../../domain'

function makeArcNpc(base: NpcRuntimeState): NpcRuntimeState {
  return {
    ...base,
    npcArc: {
      arcId: 'arc-becoming',
      stage: 'forming',
      stageEnteredDay: 0,
      stageFlags: {},
      driftHistory: [],
    },
  }
}

describe('applyNpcTraitDrift', () => {
  it('does not drift traits on NPCs without npcArc', () => {
    const state = initialStateWithIda
    const traitsBefore = state.npcRuntimeStates.map((n) => ({ ...n.traits }))

    const result = applyNpcTraitDrift(state, () => 0)

    result.npcRuntimeStates.forEach((npc, i) => {
      expect(npc.traits).toEqual(traitsBefore[i])
    })
  })

  it('drifts traits toward influencer when rng triggers (rng returns 0 = always triggers)', () => {
    const learner = makeArcNpc({ ...initialStateWithIda.npcRuntimeStates[1]! })
    const influencer = initialStateWithIda.npcRuntimeStates[0]!

    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: [influencer, learner],
    }

    const result = applyNpcTraitDrift(state, () => 0)

    const updatedLearner = result.npcRuntimeStates.find((n) => n.npcId === learner.npcId)!
    // At least one of the drift traits should have shifted toward influencer
    const driftTraits = ['empathy', 'discipline', 'ruthlessness', 'curiosity', 'loyalty'] as const
    const anyChanged = driftTraits.some(
      (t) => Math.abs(updatedLearner.traits[t] - learner.traits[t]) > 0,
    )
    expect(anyChanged).toBe(true)
  })

  it('never drifts below 0 or above 100', () => {
    const learner = makeArcNpc({
      ...initialStateWithIda.npcRuntimeStates[1]!,
      traits: {
        ...initialStateWithIda.npcRuntimeStates[1]!.traits,
        empathy: 0,
        discipline: 100,
      },
    })
    const influencer = {
      ...initialStateWithIda.npcRuntimeStates[0]!,
      traits: {
        ...initialStateWithIda.npcRuntimeStates[0]!.traits,
        empathy: 0,
        discipline: 100,
      },
    }

    const state = { ...initialStateWithIda, npcRuntimeStates: [influencer, learner] }
    const result = applyNpcTraitDrift(state, () => 0)

    const updated = result.npcRuntimeStates.find((n) => n.npcId === learner.npcId)!
    const allTraits = Object.values(updated.traits)
    expect(allTraits.every((v) => v >= 0 && v <= 100)).toBe(true)
  })

  it('records drift in driftHistory', () => {
    const learner = makeArcNpc({ ...initialStateWithIda.npcRuntimeStates[1]! })
    const influencer = initialStateWithIda.npcRuntimeStates[0]!

    const state = { ...initialStateWithIda, npcRuntimeStates: [influencer, learner] }
    const result = applyNpcTraitDrift(state, () => 0)

    const updated = result.npcRuntimeStates.find((n) => n.npcId === learner.npcId)!
    expect(updated.npcArc!.driftHistory.length).toBeGreaterThan(0)
    expect(updated.npcArc!.driftHistory[0]).toMatchObject({
      day: state.day,
      source: `proximity-${influencer.npcId}`,
    })
  })

  it('does not drift when rng never triggers (rng returns 1 = never < 0.15)', () => {
    const learner = makeArcNpc({ ...initialStateWithIda.npcRuntimeStates[1]! })
    const influencer = initialStateWithIda.npcRuntimeStates[0]!

    const state = { ...initialStateWithIda, npcRuntimeStates: [influencer, learner] }
    const traitsBefore = { ...learner.traits }

    const result = applyNpcTraitDrift(state, () => 1)

    const updated = result.npcRuntimeStates.find((n) => n.npcId === learner.npcId)!
    expect(updated.traits).toEqual(traitsBefore)
    expect(updated.npcArc!.driftHistory).toHaveLength(0)
  })

  it('does not drift traits when arc is in set stage', () => {
    const learner: NpcRuntimeState = {
      ...initialStateWithIda.npcRuntimeStates[1]!,
      npcArc: {
        arcId: 'arc-becoming',
        stage: 'set',
        stageEnteredDay: 0,
        stageFlags: {},
        driftHistory: [],
      },
    }
    const influencer = initialStateWithIda.npcRuntimeStates[0]!
    const state = { ...initialStateWithIda, npcRuntimeStates: [influencer, learner] }
    const traitsBefore = { ...learner.traits }

    const result = applyNpcTraitDrift(state, () => 0) // always triggers

    const updated = result.npcRuntimeStates.find((n) => n.npcId === learner.npcId)!
    expect(updated.traits).toEqual(traitsBefore)
  })

  it('applies larger delta in forming stage than crystallizing stage', () => {
    const makeArcNpc = (stage: 'forming' | 'crystallizing'): NpcRuntimeState => ({
      ...initialStateWithIda.npcRuntimeStates[1]!,
      npcId: `npc-test-${stage}`,
      npcArc: { arcId: 'arc-becoming', stage, stageEnteredDay: 0, stageFlags: {}, driftHistory: [] },
      traits: { ...initialStateWithIda.npcRuntimeStates[1]!.traits, discipline: 30 },
    })
    const influencer = {
      ...initialStateWithIda.npcRuntimeStates[0]!,
      traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, discipline: 80 },
    }

    const formingNpc = makeArcNpc('forming')
    const crystallizingNpc = makeArcNpc('crystallizing')

    const stateForming = { ...initialStateWithIda, npcRuntimeStates: [influencer, formingNpc] }
    const stateCryst = { ...initialStateWithIda, npcRuntimeStates: [influencer, crystallizingNpc] }

    const resultF = applyNpcTraitDrift(stateForming, () => 0)
    const resultC = applyNpcTraitDrift(stateCryst, () => 0)

    const deltaF = resultF.npcRuntimeStates[1]!.traits.discipline - 30
    const deltaC = resultC.npcRuntimeStates[1]!.traits.discipline - 30

    expect(deltaF).toBeGreaterThan(deltaC)
  })

  it('drifts arc-ward-growing NPCs at ×3 rate compared to arc-becoming', () => {
    const makeWardNpc = (): NpcRuntimeState => ({
      ...initialStateWithIda.npcRuntimeStates[1]!,
      npcId: 'npc-ward-test',
      npcArc: { arcId: 'arc-ward-growing', stage: 'early-childhood', stageEnteredDay: 0, stageFlags: {}, driftHistory: [] },
      traits: { ...initialStateWithIda.npcRuntimeStates[1]!.traits, discipline: 30 },
    })
    const makeBecomingNpc = (): NpcRuntimeState => ({
      ...initialStateWithIda.npcRuntimeStates[1]!,
      npcId: 'npc-becoming-test',
      npcArc: { arcId: 'arc-becoming', stage: 'forming', stageEnteredDay: 0, stageFlags: {}, driftHistory: [] },
      traits: { ...initialStateWithIda.npcRuntimeStates[1]!.traits, discipline: 30 },
    })
    const influencer = {
      ...initialStateWithIda.npcRuntimeStates[0]!,
      traits: { ...initialStateWithIda.npcRuntimeStates[0]!.traits, discipline: 80 },
    }

    const stateWard = { ...initialStateWithIda, npcRuntimeStates: [influencer, makeWardNpc()] }
    const stateBecoming = { ...initialStateWithIda, npcRuntimeStates: [influencer, makeBecomingNpc()] }

    const resultWard = applyNpcTraitDrift(stateWard, () => 0)
    const resultBecoming = applyNpcTraitDrift(stateBecoming, () => 0)

    const deltaWard = resultWard.npcRuntimeStates[1]!.traits.discipline - 30
    const deltaBecoming = resultBecoming.npcRuntimeStates[1]!.traits.discipline - 30

    // Early-childhood ward multiplier (3.0) vs forming multiplier (2.0)
    expect(deltaWard).toBeGreaterThan(deltaBecoming)
  })

  it('same seed produces identical results (deterministic)', () => {
    const learner = makeArcNpc({ ...initialStateWithIda.npcRuntimeStates[1]! })
    const state = { ...initialStateWithIda, npcRuntimeStates: [initialStateWithIda.npcRuntimeStates[0]!, learner] }

    let callCount = 0
    const deterministicRng = () => {
      const values = [0.05, 0.2, 0.08, 0.9, 0.1, 0.04, 0.3, 0.07, 0.85, 0.02]
      return values[callCount++ % values.length]!
    }

    callCount = 0
    const result1 = applyNpcTraitDrift(state, deterministicRng)
    callCount = 0
    const result2 = applyNpcTraitDrift(state, deterministicRng)

    expect(result1.npcRuntimeStates).toEqual(result2.npcRuntimeStates)
  })
})
