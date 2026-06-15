import { describe, expect, it } from 'vitest'
import { advanceRomanceArc } from './advanceRomanceArc'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey, type IntimacyStage } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'

const NPC_ID = 'npc-ida-rhys'
const PLAYER_ID = 'player'

function stateWithRelationship(overrides: {
  trust?: number
  affinity?: number
  fear?: number
  loyalty?: number
  intimacyStage?: string
  bondType?: string
}): GameState {
  const playerToNpc = buildRelationshipKey(PLAYER_ID, NPC_ID)
  const npcToPlayer = buildRelationshipKey(NPC_ID, PLAYER_ID)
  return {
    ...initialStateWithIda,
    relationships: {
      ...initialStateWithIda.relationships,
      [playerToNpc]: {
        affinity: overrides.affinity ?? 0,
        trust: overrides.trust ?? 0,
        fear: overrides.fear ?? 0,
        respect: 0,
        loyalty: 0,
        intimacyStage: (overrides.intimacyStage as IntimacyStage) ?? undefined,
        bondType: overrides.bondType,
      },
      [npcToPlayer]: {
        affinity: 0,
        trust: 0,
        fear: 0,
        respect: 0,
        loyalty: overrides.loyalty ?? 0,
        intimacyStage: (overrides.intimacyStage as IntimacyStage) ?? undefined,
        bondType: overrides.bondType,
      },
    },
  }
}

describe('advanceRomanceArc', () => {
  it('returns state unchanged for non-eligible NPC', () => {
    const state = {
      ...initialStateWithIda,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, 'npc-verek-holst')]: {
          affinity: 80,
          trust: 80,
          fear: 0,
          respect: 0,
          loyalty: 60,
        },
        [buildRelationshipKey('npc-verek-holst', PLAYER_ID)]: {
          affinity: 0,
          trust: 0,
          fear: 0,
          respect: 0,
          loyalty: 60,
        },
      },
    }
    const verekInRoster = {
      ...initialStateWithIda.roster[0]!,
      npcId: 'npc-verek-holst',
      name: 'Verek Holst',
    }
    const result = advanceRomanceArc(
      { ...state, roster: [verekInRoster] },
      'npc-verek-holst',
    )
    expect(result.activityLog).toEqual(state.activityLog)
  })

  it('advances none → affinity when trust and affinity thresholds met', () => {
    const state = stateWithRelationship({ trust: 35, affinity: 25, fear: 10 })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(edge.bondType).toBe('romantic')
  })

  it('does not advance when trust below threshold', () => {
    const state = stateWithRelationship({ trust: 20, affinity: 25, fear: 10 })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]
    expect(edge?.intimacyStage ?? 'none').toBe('none')
  })

  it('does not advance when fear is too high', () => {
    const state = stateWithRelationship({ trust: 35, affinity: 25, fear: 60 })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]
    expect(edge?.intimacyStage ?? 'none').toBe('none')
  })

  it('advances affinity → attachment when conditions met', () => {
    const state = stateWithRelationship({
      trust: 55,
      affinity: 45,
      fear: 10,
      loyalty: 50,
      intimacyStage: 'affinity',
      bondType: 'romantic',
    })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('attachment')
  })

  it('advances attachment → committed when all committed conditions met', () => {
    const state = stateWithRelationship({
      trust: 75,
      affinity: 50,
      fear: 20,
      loyalty: 45,
      intimacyStage: 'attachment',
      bondType: 'romantic',
    })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('committed')
  })

  it('does not advance attachment → committed without romantic bond type', () => {
    const state = stateWithRelationship({
      trust: 75,
      affinity: 50,
      fear: 20,
      loyalty: 45,
      intimacyStage: 'attachment',
      bondType: undefined,
    })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('attachment')
  })

  it('returns state unchanged when already at committed', () => {
    const state = stateWithRelationship({
      trust: 80,
      affinity: 60,
      fear: 10,
      loyalty: 60,
      intimacyStage: 'committed',
      bondType: 'romantic',
    })
    const logBefore = state.activityLog.length
    const result = advanceRomanceArc(state, NPC_ID)
    expect(result.activityLog.length).toBe(logBefore)
  })

  it('returns state unchanged for ward NPCs', () => {
    const wardNpc = { ...initialStateWithIda.roster[0]!, status: 'ward' as const }
    const state = {
      ...stateWithRelationship({ trust: 80, affinity: 50, fear: 5 }),
      roster: [wardNpc],
    }
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]
    expect(edge?.intimacyStage ?? 'none').toBe('none')
  })
})
