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
  respect?: number
  intimacyStage?: string
  bondType?: string
  captivityStatus?: 'captive' | 'missing' | null
  status?: 'mercenary' | 'ward'
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
        respect: overrides.respect ?? 0,
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
    roster: [
      {
        ...initialStateWithIda.roster[1]!,
        status: overrides.status ?? 'mercenary',
        captivityState: overrides.captivityStatus
          ? {
              status: overrides.captivityStatus,
              holderId: null,
              siteId: null,
              roomId: null,
              regime: 'unknown',
              condition: 'healthy',
              compliance: 'resistant',
              bondType: 'none',
              timeHeldDays: 0,
              lastTransferDay: null,
              questTag: null,
            }
          : undefined,
      },
    ],
  }
}

describe('advanceRomanceArc', () => {
  it('advances any NPC (no romanceEligible check)', () => {
    // Verek Holst is now romance-eligible (no flag check)
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
    // Now advances! All NPCs are eligible.
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, 'npc-verek-holst')]!
    expect(edge.intimacyStage).toBe('affinity')
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

  it('ADVANCES attachment → committed WITHOUT romantic bond type (removed mutual requirement)', () => {
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
    // Now advances! Mutual bondType no longer required.
    expect(edge.intimacyStage).toBe('committed')
  })

  it('advances even with negative respect (toxic relationships possible)', () => {
    const state = stateWithRelationship({
      trust: 75,
      affinity: 50,
      fear: 20,
      loyalty: 45,
      intimacyStage: 'attachment',
      bondType: 'romantic',
      respect: -50, // Very negative respect
    })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Still advances! Negative respect no longer blocks.
    expect(edge.intimacyStage).toBe('committed')
    expect(result.activityLog[0]?.message).toMatch(/strain/)
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

  it('ADVANCES for ward NPCs (no longer blocked)', () => {
    const wardNpc = { ...initialStateWithIda.roster[1]!, status: 'ward' as const }
    const state = {
      ...stateWithRelationship({ trust: 80, affinity: 50, fear: 5, status: 'ward' }),
      roster: [wardNpc],
    }
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Now advances! Wards can progress intimacy.
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/young age/)
  })

  it('ADVANCES for captive NPCs (no longer blocked)', () => {
    const state = stateWithRelationship({ trust: 80, affinity: 50, fear: 5, captivityStatus: 'captive' })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Now advances! Captives can progress intimacy.
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/captivity/)
  })

  it('adds context tag for missing NPCs', () => {
    const state = stateWithRelationship({ trust: 80, affinity: 50, fear: 5, captivityStatus: 'missing' })
    const result = advanceRomanceArc(state, NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/absence/)
  })
})
