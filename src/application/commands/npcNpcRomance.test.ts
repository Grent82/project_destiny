import { describe, it, expect } from 'vitest'
import { tryNpcNpcFlirtation, checkNpcNpcJealousy, simulateNpcNpcRomance } from './npcNpcRomance'
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
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === MARION ? { ...n, assignment: 'deployed' as const } : n,
      ),
    }
    const result = tryNpcNpcFlirtation(state, MARION, IDA, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('checkNpcNpcJealousy', () => {
  it('does nothing with fewer than 3 eligible roster NPCs', () => {
    const state = withRelationship(initialStateWithIda, MARION, IDA, { affinity: 80, trust: 40, fear: 0 })
    const result = checkNpcNpcJealousy(state, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('increases fear and decreases affinity toward a higher-affinity rival', () => {
    const cress = createRosterEntry(CRESS, 'Cress Aldmoor')
    const base: GameState = {
      ...initialStateWithIda,
      roster: [...initialStateWithIda.roster, cress],
    }
    // Marion is jealous: has high affinity with Ida, but Cress has even higher affinity with Ida.
    let state = withRelationship(base, MARION, IDA, { affinity: 80, trust: 40, fear: 0 })
    state = withRelationship(state, CRESS, IDA, { affinity: 90, trust: 40, fear: 0 })

    const result = checkNpcNpcJealousy(state, alwaysSucceed)

    const marionToCress = result.relationships[buildRelationshipKey(MARION, CRESS)]
    expect(marionToCress).toBeDefined()
    expect(marionToCress!.fear).toBeGreaterThan(0)
    expect(marionToCress!.affinity).toBeLessThan(0)
  })
})

describe('simulateNpcNpcRomance — courtship is not part of the daily loop', () => {
  it('never advances intimacyStage, even when courtship thresholds are met', () => {
    // Affinity/trust comfortably clear every NPC_INTIMACY_ADVANCE_CONDITIONS stage.
    let state = withRelationship(initialStateWithIda, MARION, IDA, {
      affinity: 90,
      trust: 90,
      loyalty: 90,
      fear: 0,
      intimacyStage: 'none',
    })

    // Run several days worth of simulation; if tryNpcNpcCourtship were still hooked in,
    // repeated high-probability rolls would eventually advance the stage.
    for (let day = 0; day < 20; day++) {
      state = simulateNpcNpcRomance(state, alwaysSucceed)
    }

    const rel = state.relationships[buildRelationshipKey(MARION, IDA)]!
    expect(rel.intimacyStage).toBe('none')
  })
})
