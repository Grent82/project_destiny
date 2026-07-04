import { describe, it, expect } from 'vitest'
import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { NPC_IDS } from '../content/ids/npcIds'
import { FACTION_IDS } from '../content/ids/factionIds'
import { getRelationshipPoliticalCapital, getBondHolderLeverage } from './politicalLeverage'

// Marion Vale is Civic Compact, Ida Rhys is Foundry League
const MARION_ID = NPC_IDS.MARION_VALE
const IDA_ID = NPC_IDS.IDA_RHYS

describe('getRelationshipPoliticalCapital', () => {
  it('returns score=0 and empty sources when no faction-affiliated NPCs are on roster', () => {
    const result = getRelationshipPoliticalCapital(
      initialGameStateSnapshot,
      FACTION_IDS.TALLOW_RING,
    )
    expect(result.score).toBe(0)
    expect(result.sources).toHaveLength(0)
  })

  it('returns score=0 when faction NPC is on roster but relationship edges are default (no intimacy)', () => {
    const result = getRelationshipPoliticalCapital(
      initialGameStateSnapshot,
      FACTION_IDS.CIVIC_COMPACT,
    )
    expect(result.score).toBe(0)
    expect(result.sources).toHaveLength(0)
  })

  it('scores intimacy=committed as strength 80 for a Civic Compact NPC', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey('player', MARION_ID)]: {
          affinity: 60,
          respect: 50,
          fear: 0,
          trust: 50,
          loyalty: 40,
          intimacyStage: 'committed',
        },
      },
    }
    const result = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    expect(result.score).toBeGreaterThan(0)
    const intimacySource = result.sources.find((s) => s.reason === 'intimacy')
    expect(intimacySource).toBeDefined()
    expect(intimacySource?.strength).toBe(80)
  })

  it('scores intimacy=attachment as strength 50', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey('player', MARION_ID)]: {
          affinity: 40,
          respect: 30,
          fear: 0,
          trust: 30,
          loyalty: 30,
          intimacyStage: 'attachment',
        },
      },
    }
    const result = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    const intimacySource = result.sources.find((s) => s.reason === 'intimacy')
    expect(intimacySource?.strength).toBe(50)
  })

  it('scores fear-bond when NPC fears player AND player holds their bond', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === MARION_ID
          ? {
              ...n,
              bondStatus: {
                holderId: 'player',
                contractValue: 100,
                termDays: 30,
                entryReason: 'debt-settlement' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 100,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : n,
      ),
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey(MARION_ID, 'player')]: {
          affinity: -10,
          respect: 0,
          fear: 70,
          trust: 0,
          loyalty: 0,
        },
      },
    }
    const result = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    const fearSource = result.sources.find((s) => s.reason === 'fear-bond')
    expect(fearSource).toBeDefined()
    expect(fearSource?.strength).toBe(Math.round(70 * 0.6)) // = 42
  })

  it('does NOT score fear-bond when fear is below threshold (<=50)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === MARION_ID
          ? {
              ...n,
              bondStatus: {
                holderId: 'player',
                contractValue: 50,
                termDays: 20,
                entryReason: 'voluntary' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 50,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : n,
      ),
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey(MARION_ID, 'player')]: {
          affinity: 10,
          respect: 10,
          fear: 40,
          trust: 10,
          loyalty: 10,
        },
      },
    }
    const result = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    expect(result.sources.find((s) => s.reason === 'fear-bond')).toBeUndefined()
  })

  it('caps score at 100 when sources would sum above 100', () => {
    const state: GameState = {
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        [buildRelationshipKey('player', MARION_ID)]: {
          affinity: 80,
          respect: 70,
          fear: 0,
          trust: 70,
          loyalty: 60,
          intimacyStage: 'committed',
          bondType: 'romantic',
          hardBond: true,
        },
      },
    }
    const result = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('only scores NPCs affiliated to the requested faction', () => {
    const state: GameState = {
      ...initialStateWithIda,
      relationships: {
        ...initialStateWithIda.relationships,
        [buildRelationshipKey('player', IDA_ID)]: {
          affinity: 60,
          respect: 50,
          fear: 0,
          trust: 50,
          loyalty: 40,
          intimacyStage: 'committed',
        },
      },
    }
    // Civic Compact query should not include Ida's Foundry League edge
    const compactResult = getRelationshipPoliticalCapital(state, FACTION_IDS.CIVIC_COMPACT)
    expect(compactResult.sources.every((s) => s.npcId !== IDA_ID)).toBe(true)

    // Foundry League query should include Ida's committed edge
    const foundryResult = getRelationshipPoliticalCapital(state, FACTION_IDS.FOUNDRY_LEAGUE)
    expect(foundryResult.sources.some((s) => s.npcId === IDA_ID && s.reason === 'intimacy')).toBe(
      true,
    )
  })
})

describe('getBondHolderLeverage', () => {
  it('returns canExert=false when NPC has no bondStatus', () => {
    const result = getBondHolderLeverage(initialGameStateSnapshot, MARION_ID)
    expect(result.canExert).toBe(false)
    expect(result.risk).toBe(0)
  })

  it('returns canExert=false when bond is held by an NPC, not the player', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === MARION_ID
          ? {
              ...n,
              bondStatus: {
                holderId: 'npc-other',
                contractValue: 80,
                termDays: 20,
                entryReason: 'inherited' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 80,
                ownerType: 'npc' as const,
                bondStartDay: 1,
              },
            }
          : n,
      ),
    }
    const result = getBondHolderLeverage(state, MARION_ID)
    expect(result.canExert).toBe(false)
  })

  it('returns canExert=true when leverage score is high (high fear + dominance diff + coercive reason)', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        traits: { ...initialGameStateSnapshot.playerCharacter.traits, dominance: 90 },
      },
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === MARION_ID
          ? {
              ...n,
              traits: { ...n.traits, dominance: 20 },
              bondStatus: {
                holderId: 'player',
                contractValue: 100,
                termDays: 30,
                entryReason: 'combat-capture' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 100,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : n,
      ),
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey(MARION_ID, 'player')]: {
          affinity: -20,
          respect: 0,
          fear: 80,
          trust: 0,
          loyalty: 0,
        },
      },
    }
    const result = getBondHolderLeverage(state, MARION_ID)
    expect(result.canExert).toBe(true)
    expect(result.flavor).toContain('Marion Vale')
  })

  it('includes NPC name in flavor string', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        traits: { ...initialGameStateSnapshot.playerCharacter.traits, dominance: 80 },
      },
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n) =>
        n.npcId === MARION_ID
          ? {
              ...n,
              traits: { ...n.traits, dominance: 10 },
              bondStatus: {
                holderId: 'player',
                contractValue: 60,
                termDays: 15,
                entryReason: 'debt-settlement' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 60,
                ownerType: 'player' as const,
                bondStartDay: 2,
              },
            }
          : n,
      ),
      relationships: {
        ...initialGameStateSnapshot.relationships,
        [buildRelationshipKey(MARION_ID, 'player')]: {
          affinity: -10,
          respect: 0,
          fear: 75,
          trust: 0,
          loyalty: 0,
        },
      },
    }
    const result = getBondHolderLeverage(state, MARION_ID)
    expect(result.flavor).toContain('Marion Vale')
    expect(result.risk).toBeGreaterThanOrEqual(0)
    expect(result.risk).toBeLessThanOrEqual(100)
  })
})
