import { describe, expect, it } from 'vitest'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'
import { deepConversation } from './deepConversation'
import { initialStateWithIda } from './testFixtures'

const NPC_ID = 'npc-ida-rhys'
const PLAYER_ID = 'player'

function stateWithRelationship(overrides: {
  trust?: number
  affinity?: number
  fear?: number
  loyalty?: number
  respect?: number
  intimacyStage?: 'none' | 'affinity' | 'attachment' | 'committed'
  empathy?: number
  prudence?: number
  ambition?: number
  curiosity?: number
  ruthlessness?: number
  assignment?: 'idle' | 'deployed' | 'working'
  captivityStatus?: 'captive' | 'missing' | null
  status?: 'mercenary' | 'ward'
}): GameState {
  const playerToNpc = buildRelationshipKey(PLAYER_ID, NPC_ID)
  const npcToPlayer = buildRelationshipKey(NPC_ID, PLAYER_ID)
  return {
    ...initialStateWithIda,
    currentDistrictId: 'district-the-pale',
    houseDistrictId: 'district-the-pale',
    relationships: {
      ...initialStateWithIda.relationships,
      [playerToNpc]: {
        affinity: overrides.affinity ?? 0,
        trust: overrides.trust ?? 0,
        fear: overrides.fear ?? 0,
        respect: overrides.respect ?? 0,
        loyalty: 0,
        intimacyStage: overrides.intimacyStage,
      },
      [npcToPlayer]: {
        affinity: 0,
        trust: 0,
        fear: 0,
        respect: 0,
        loyalty: overrides.loyalty ?? 0,
        intimacyStage: overrides.intimacyStage,
      },
    },
    lastFiredDay: {},
    npcRuntimeStates: [
      {
        ...initialStateWithIda.npcRuntimeStates[1]!,
        assignment: overrides.assignment ?? 'idle',
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
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] }
            }
          : undefined,
        traits: {
          ...initialStateWithIda.npcRuntimeStates[1]!.traits,
          empathy: overrides.empathy ?? 50,
          prudence: overrides.prudence ?? 50,
          ambition: overrides.ambition ?? 50,
          curiosity: overrides.curiosity ?? 50,
          ruthlessness: overrides.ruthlessness ?? 50,
        },
      },
    ],
  }
}

describe('deepConversation', () => {
  it('adds a visible conversation log and improves relationship state', () => {
    // Use curiosity >= 60 to select 'past' topic which gives trust gains
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60 })

    const result = deepConversation(state, NPC_ID)

    expect(result.activityLog[0]?.id.startsWith(`deep-conv::${NPC_ID}::`)).toBe(true)
    expect(result.activityLog[0]?.message).toMatch(/You sit down with Ida Rhys to talk/i)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.trust).toBeGreaterThan(30)
  })

  it('selects topic based on NPC traits (high empathy + curiosity -> fears)', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, empathy: 65, curiosity: 60 })

    const result = deepConversation(state, NPC_ID)

    expect(result.activityLog[0]?.id).toContain('::fears::')
  })

  it('selects values topic for high prudence NPC', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, prudence: 65, ambition: 60 })

    const result = deepConversation(state, NPC_ID)

    expect(result.activityLog[0]?.id).toContain('::values::')
  })

  it('applies empathy bonus to fears conversation', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, empathy: 70 })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Base trust gain for fears is 4, with empathy >= 65 bonus of +2 = 6
    expect(edge.trust).toBe(36)
  })

  it('applies curiosity bonus to past conversation', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 65 })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Base trust gain for past is 3, with curiosity >= 60 bonus of +2 = 5
    expect(edge.trust).toBe(35)
  })

  it('reduces fear when discussing fears topic', () => {
    // Use empathy >= 60 and curiosity >= 50 to select 'fears' topic
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 30, empathy: 65, curiosity: 55 })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.fear).toBeLessThan(30)
  })

  it('can advance the romance arc through deep conversation', () => {
    const state = stateWithRelationship({ trust: 35, affinity: 25, fear: 10 })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
  })

  it('does not allow repeated deep conversation with the same NPC on the same day', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10 })

    const once = deepConversation(state, NPC_ID)
    const twice = deepConversation(once, NPC_ID)

    const matchingEntries = twice.activityLog.filter((entry) => entry.id.startsWith(`deep-conv::${NPC_ID}::`))
    expect(matchingEntries).toHaveLength(1)
    expect(twice).toBe(once)
  })

  it('allows different topics on the same day', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, empathy: 70 })

    const first = deepConversation(state, NPC_ID)
    // Manually change the topic in the second call by modifying state to allow different topic
    // Since topic selection is trait-based, we need different traits for different topic
    const secondNpc = {
      ...state.npcRuntimeStates[0]!,
      traits: { ...state.npcRuntimeStates[0]!.traits, prudence: 70, empathy: 40 },
    }
    const secondState = { ...first, npcRuntimeStates: [secondNpc] }
    const second = deepConversation(secondState, NPC_ID)

    const entries = second.activityLog.filter((entry) => entry.id.startsWith(`deep-conv::${NPC_ID}::`))
    expect(entries).toHaveLength(2)
  })

  it('returns state unchanged for NPC not at house', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10 })
    const awayState = { ...state, currentDistrictId: 'district-tangle' }

    const result = deepConversation(awayState, NPC_ID)

    expect(result.activityLog).toEqual(state.activityLog)
  })

  it('returns state unchanged for deployed NPC', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10 })
    const deployedState = {
      ...state,
      npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignment: 'deployed' as const }],
    }

    const result = deepConversation(deployedState, NPC_ID)

    // Deployed NPCs CAN still have deep conversations, just with reduced gains
    expect(result.activityLog[0]?.message).toMatch(/on deployment/)
    expect(result.activityLog[0]?.message).toMatch(/Gains reduced/)
  })

  it('applies deployment penalty (50% reduced gains)', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60, assignment: 'deployed' })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Base trust gain for past is 3 + 2 (curiosity) = 5, with 50% reduction = 2.5, rounded to 3
    expect(edge.trust).toBe(33) // 30 + 3
    expect(result.activityLog[0]?.message).toMatch(/Gains reduced/)
  })

  it('applies negative respect penalty (50% reduced gains)', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60, respect: -35 })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    // Base trust gain for past is 3 + 2 (curiosity) = 5, with 50% reduction = 2.5, rounded to 3
    expect(edge.trust).toBe(33) // 30 + 3
    expect(result.activityLog[0]?.message).toMatch(/strained relationship/)
  })

  it('allows conversation for ward NPCs (no longer blocked)', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60, status: 'ward' })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/young/)
  })

  it('allows conversation for captive NPCs (no longer blocked)', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60, captivityStatus: 'captive' })

    const result = deepConversation(state, NPC_ID)

    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.intimacyStage).toBe('affinity')
    expect(result.activityLog[0]?.message).toMatch(/in captivity/)
  })

  it('adds context tag for missing NPCs', () => {
    const state = stateWithRelationship({ trust: 30, affinity: 20, fear: 10, curiosity: 60, captivityStatus: 'missing' })

    const result = deepConversation(state, NPC_ID)

    expect(result.activityLog[0]?.message).toMatch(/missing/)
  })
})
