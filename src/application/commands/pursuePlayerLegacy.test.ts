import { describe, expect, it } from 'vitest'
import { pursuePlayerLegacy, tickLegacyIntent, tickPregnancyProgress } from './pursuePlayerLegacy'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'

const NPC_ID = 'npc-ida-rhys'
const PLAYER_ID = 'player'

function committedState(): GameState {
  const playerToNpc = buildRelationshipKey(PLAYER_ID, NPC_ID)
  return {
    ...initialStateWithIda,
    relationships: {
      ...initialStateWithIda.relationships,
      [playerToNpc]: {
        affinity: 70,
        trust: 80,
        fear: 5,
        respect: 20,
        loyalty: 50,
        intimacyStage: 'committed' as const,
        bondType: 'romantic',
      },
    },
  }
}

describe('pursuePlayerLegacy', () => {
  it('sets legacyIntentActive on committed edge', () => {
    const result = pursuePlayerLegacy(committedState(), NPC_ID)
    const edge = result.relationships[buildRelationshipKey(PLAYER_ID, NPC_ID)]!
    expect(edge.legacyIntentActive).toBe(true)
  })

  it('adds activity log entry on success', () => {
    const state = committedState()
    const result = pursuePlayerLegacy(state, NPC_ID)
    expect(result.activityLog.length).toBeGreaterThan(state.activityLog.length)
  })

  it('returns state unchanged below committed stage', () => {
    const playerToNpc = buildRelationshipKey(PLAYER_ID, NPC_ID)
    const state: GameState = {
      ...initialStateWithIda,
      relationships: {
        [playerToNpc]: {
          affinity: 70,
          trust: 80,
          fear: 5,
          respect: 20,
          loyalty: 50,
          intimacyStage: 'attachment' as const,
          bondType: 'romantic',
        },
      },
    }
    const logBefore = state.activityLog.length
    const result = pursuePlayerLegacy(state, NPC_ID)
    expect(result.activityLog.length).toBe(logBefore)
    expect(result.relationships[playerToNpc]?.legacyIntentActive).toBeFalsy()
  })

  it('returns state unchanged for NPC not on roster', () => {
    const result = pursuePlayerLegacy(committedState(), 'npc-does-not-exist')
    expect(result).toEqual(committedState())
  })
})

describe('tickLegacyIntent', () => {
  it('sets pregnancyState with consensual context when rng triggers', () => {
    const state = {
      ...committedState(),
      relationships: {
        ...committedState().relationships,
        [buildRelationshipKey(PLAYER_ID, NPC_ID)]: {
          affinity: 70,
          trust: 80,
          fear: 5,
          respect: 20,
          loyalty: 50,
          intimacyStage: 'committed' as const,
          bondType: 'romantic',
          legacyIntentActive: true,
        },
      },
    }
    // rng always returns 0: below any probability threshold
    const result = tickLegacyIntent(state, () => 0)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.pregnancyState?.context).toBe('consensual')
    expect(npc.pregnancyState?.daysElapsed).toBe(0)
  })

  it('does not set pregnancyState when rng does not trigger', () => {
    const state = {
      ...committedState(),
      relationships: {
        ...committedState().relationships,
        [buildRelationshipKey(PLAYER_ID, NPC_ID)]: {
          affinity: 70,
          trust: 80,
          fear: 5,
          respect: 20,
          loyalty: 50,
          intimacyStage: 'committed' as const,
          bondType: 'romantic',
          legacyIntentActive: true,
        },
      },
    }
    // rng returns 1: always above threshold
    const result = tickLegacyIntent(state, () => 1)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.pregnancyState).toBeUndefined()
  })

  it('clears legacyIntentActive after setting pregnancyState', () => {
    const key = buildRelationshipKey(PLAYER_ID, NPC_ID)
    const state = {
      ...committedState(),
      relationships: {
        ...committedState().relationships,
        [key]: {
          affinity: 70,
          trust: 80,
          fear: 5,
          respect: 20,
          loyalty: 50,
          intimacyStage: 'committed' as const,
          bondType: 'romantic',
          legacyIntentActive: true,
        },
      },
    }
    const result = tickLegacyIntent(state, () => 0)
    expect(result.relationships[key]?.legacyIntentActive).toBe(false)
  })
})

describe('tickPregnancyProgress', () => {
  it('increments daysElapsed each tick', () => {
    const state: GameState = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === NPC_ID
          ? { ...n, pregnancyState: { context: 'consensual', daysElapsed: 10, questTag: null, wanted: null } }
          : n,
      ),
    }
    const result = tickPregnancyProgress(state)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.pregnancyState?.daysElapsed).toBe(11)
  })

  it('creates biological heir after gestation completes', () => {
    const state: GameState = {
      ...initialStateWithIda,
      relationships: {
        [buildRelationshipKey(PLAYER_ID, NPC_ID)]: {
          affinity: 72,
          trust: 68,
          respect: 44,
          fear: 0,
          loyalty: 51,
          intimacyStage: 'committed',
        },
      },
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === NPC_ID
          ? { ...n, pregnancyState: { context: 'consensual', daysElapsed: 269, questTag: null, wanted: null } }
          : n,
      ),
    }
    const result = tickPregnancyProgress(state)
    const heir = result.house.houseHeirs[0]
    expect(heir).toBeDefined()
    expect(heir!.origin).toBe('biological')
    expect(heir!.parentRefs).toContain(NPC_ID)
    expect(heir!.parentRefs).toContain(PLAYER_ID)
    expect(heir!.originStory).not.toBe(`Born to Ida Rhys within House Valdris.`)
    expect(heir!.originStory).toMatch(/private|register|house/i)
    expect(heir!.legitimacyStatus).toBe('recognized')
  })

  it('clears pregnancyState after birth', () => {
    const state: GameState = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === NPC_ID
          ? { ...n, pregnancyState: { context: 'consensual', daysElapsed: 269, questTag: null, wanted: null } }
          : n,
      ),
    }
    const result = tickPregnancyProgress(state)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.pregnancyState).toBeUndefined()
  })

  it('does not create heir for unknown context pregnancies', () => {
    const state: GameState = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === NPC_ID
          ? { ...n, pregnancyState: { context: 'unknown', daysElapsed: 269, questTag: null, wanted: null } }
          : n,
      ),
    }
    const result = tickPregnancyProgress(state)
    expect(result.house.houseHeirs.length).toBe(0)
  })

  it('marks ward-born heirs as hidden and gives them a distinct origin story', () => {
    const state: GameState = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === NPC_ID
          ? {
              ...n,
              status: 'ward',
              pregnancyState: {
                context: 'consensual',
                daysElapsed: 269,
                questTag: null,
                partnerNpcId: PLAYER_ID,
                wanted: null,
              },
            }
          : n,
      ),
      relationships: {
        [buildRelationshipKey(PLAYER_ID, NPC_ID)]: {
          affinity: 70,
          trust: 66,
          respect: 40,
          fear: 0,
          loyalty: 48,
          intimacyStage: 'committed',
        },
      },
    }

    const result = tickPregnancyProgress(state)
    const heir = result.house.houseHeirs[0]
    expect(heir).toBeDefined()
    expect(heir!.legitimacyStatus).toBe('hidden')
    expect(heir!.originStory).toMatch(/ward|protection|register/i)
  })
})
