import { describe, it, expect } from 'vitest'
import { tryNpcNpcFlirtation, checkJealousyForNpc, tryNpcNpcSeekIntimacy, tryNpcNpcFlirtAggressively } from './npcNpcRomance'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { NPC_IDS } from '../content/ids/npcIds'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const MARION = NPC_IDS.MARION_VALE
const IDA = NPC_IDS.IDA_RHYS
const CRESS = NPC_IDS.CRESS_ALDMOOR

const alwaysSucceed = () => 0
const alwaysFail = () => 0.999

function withRelationship(
  state: GameState,
  aId: string,
  bId: string,
  axes: { affinity: number; trust?: number; fear?: number; respect?: number; loyalty?: number; intimacyStage?: 'none' | 'affinity' | 'attachment' | 'committed' },
): GameState {
  const filled = { trust: 0, fear: 0, respect: 0, loyalty: 0, ...axes }
  return {
    ...state,
    relationships: {
      ...state.relationships,
      [buildRelationshipKey(aId, bId)]: filled,
      [buildRelationshipKey(bId, aId)]: filled,
    },
  }
}

function createRosterEntry(npcId: string, name: string, overrides?: Partial<NpcRuntimeState>): NpcRuntimeState {
  return {
    npcId,
    name,
    status: 'mercenary',
    assignment: 'idle',
    ...overrides,
  } as unknown as NpcRuntimeState
}

describe('tryNpcNpcFlirtation', () => {
  it('increases affinity on a successful roll', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 50, trust: 40, fear: 0 })
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysSucceed)

    const before = state.relationships[buildRelationshipKey(MARION, IDA)]!
    const after = result.relationships[buildRelationshipKey(MARION, IDA)]!
    expect(after.affinity).toBeGreaterThan(before.affinity)
  })

  it('does nothing when the roll fails', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 50, trust: 40, fear: 0 })
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysFail)
    expect(result).toBe(state)
  })

  it('does nothing when affinity is below the flirtation threshold', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 10, trust: 40, fear: 0 })
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('does nothing when fear is above the block threshold', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 60, trust: 40, fear: 40 })
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('does nothing when one NPC is not eligible (deployed)', () => {
    const state: GameState = {
      ...withRelationship(initialStateWithIda, MARION, IDA, { affinity: 60, trust: 40, fear: 0 }),
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((n) =>
        n.npcId === MARION ? { ...n, assignment: 'deployed' as const } : n,
      ),
    }
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('tryNpcNpcSeekIntimacy', () => {
  it('increases affinity and reduces stress for both NPCs when trust is deep enough', () => {
    let state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 60, trust: 75, fear: 0 })
    state = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === MARION || n.npcId === IDA ? { ...n, states: { ...n.states, stress: 40 } } : n,
      ),
    }

    const result = tryNpcNpcSeekIntimacy(state, MARION, IDA, alwaysSucceed)

    const abAffinity = result.relationships[buildRelationshipKey(MARION, IDA)]!.affinity
    const baAffinity = result.relationships[buildRelationshipKey(IDA, MARION)]!.affinity
    expect(abAffinity).toBeGreaterThan(60)
    expect(baAffinity).toBeGreaterThan(60)

    const marion = result.npcRuntimeStates.find((n) => n.npcId === MARION)!
    const ida = result.npcRuntimeStates.find((n) => n.npcId === IDA)!
    expect(marion.states.stress).toBeLessThan(40)
    expect(ida.states.stress).toBeLessThan(40)
  })

  it('does nothing when trust is below the deep-trust threshold', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 60, trust: 50, fear: 0 })
    const result = tryNpcNpcSeekIntimacy(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('does nothing when fear is above the block threshold, even with deep trust', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 60, trust: 75, fear: 30 })
    const result = tryNpcNpcSeekIntimacy(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('tryNpcNpcFlirtAggressively', () => {
  it('increases affinity on a successful roll (higher-dominance actor)', () => {
    let state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 30, trust: 20, fear: 0 })
    state = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === MARION ? { ...n, traits: { ...n.traits, dominance: 80 } } : n,
      ),
    }

    const result = tryNpcNpcFlirtAggressively(state, MARION, IDA, alwaysSucceed)

    const abAffinity = result.relationships[buildRelationshipKey(MARION, IDA)]!.affinity
    expect(abAffinity).toBe(38) // 30 + 8
  })

  it('raises the target NPC\'s own anger state on a failed roll (not a relationship axis)', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 30, trust: 20, fear: 0 })
    const idaBefore = state.npcRuntimeStates.find((n) => n.npcId === IDA)!.states.anger

    const result = tryNpcNpcFlirtAggressively(state, MARION, IDA, alwaysFail)

    const idaAfter = result.npcRuntimeStates.find((n) => n.npcId === IDA)!.states.anger
    expect(idaAfter).toBe(idaBefore + 10)
    // Affinity must not change on failure
    expect(result.relationships[buildRelationshipKey(MARION, IDA)]!.affinity).toBe(30)
  })

  it('does nothing when fear is above the block threshold', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 30, trust: 20, fear: 20 })
    const result = tryNpcNpcFlirtAggressively(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('checkJealousyForNpc', () => {
  it('does nothing with fewer than 2 other eligible roster NPCs', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 80, trust: 40, fear: 0 })
    const result = checkJealousyForNpc(state, MARION, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('increases fear and decreases affinity toward a higher-affinity rival', () => {
    const cress = createRosterEntry(CRESS, 'Cress Aldmoor')
    const base: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, cress],
    }
    // Marion is jealous: has high affinity with Ida, but Cress has even higher affinity with Ida.
    let state = withRelationship(base, MARION, IDA, { affinity: 80, trust: 40, fear: 0 })
    state = withRelationship(state, CRESS, IDA, { affinity: 90, trust: 40, fear: 0 })

    const result = checkJealousyForNpc(state, MARION, alwaysSucceed)

    const marionToCress = result.relationships[buildRelationshipKey(MARION, CRESS)]
    expect(marionToCress).toBeDefined()
    expect(marionToCress!.fear).toBeGreaterThan(0)
    expect(marionToCress!.affinity).toBeLessThan(0)
  })

  it('does not trigger when the RNG roll fails (regression: the old intention handler had no RNG gate at all)', () => {
    const cress = createRosterEntry(CRESS, 'Cress Aldmoor')
    const base: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, cress],
    }
    let state = withRelationship(base, MARION, IDA, { affinity: 80, trust: 40, fear: 0 })
    state = withRelationship(state, CRESS, IDA, { affinity: 90, trust: 40, fear: 0 })

    const result = checkJealousyForNpc(state, MARION, alwaysFail)

    expect(result).toBe(state)
  })

  it('only affects the acting NPC, not the whole roster (scoped, not a blanket sweep)', () => {
    const cress = createRosterEntry(CRESS, 'Cress Aldmoor')
    const base: GameState = {
      ...initialStateWithIda,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, cress],
    }
    // Both Marion and Ida would independently qualify as jealous of Cress, but only Marion acts.
    let state = withRelationship(base, MARION, CRESS, { affinity: 80, trust: 40, fear: 0 })
    state = withRelationship(state, IDA, CRESS, { affinity: 90, trust: 40, fear: 0 })

    const result = checkJealousyForNpc(state, MARION, alwaysSucceed)

    const idaToCress = result.relationships[buildRelationshipKey(IDA, CRESS)]
    expect(idaToCress?.fear ?? 0).toBe(state.relationships[buildRelationshipKey(IDA, CRESS)]?.fear ?? 0)
  })
})
