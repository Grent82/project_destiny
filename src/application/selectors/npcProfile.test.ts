import { describe, it, expect } from 'vitest'
import { selectFullNpcProfile } from './npcProfile'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from '../commands/testFixtures'
import type { GameState } from '../../domain/game/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

function stateWithIda(overrides: Partial<GameState> = {}): { game: GameState } {
  return {
    game: {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [idaRhysRosterEntry],
      ...overrides,
    },
  } as { game: GameState }
}

describe('selectFullNpcProfile', () => {
  it('returns null for an NPC not on the roster', () => {
    const result = selectFullNpcProfile(stateWithIda() as never, 'npc-unknown')
    expect(result).toBeNull()
  })

  it('merges runtime state and content catalog for a roster NPC', () => {
    const result = selectFullNpcProfile(stateWithIda() as never, 'npc-ida-rhys')
    expect(result).not.toBeNull()
    expect(result!.npcId).toBe('npc-ida-rhys')
    expect(result!.skills).toBeDefined()
    expect(result!.traits).toBeDefined()
  })

  it('includes zeroed relationship axes when no relationship has been established', () => {
    const result = selectFullNpcProfile(stateWithIda() as never, 'npc-ida-rhys')
    expect(result!.playerToNpc.loyalty).toBe(0)
    expect(result!.npcToPlayer.fear).toBe(0)
  })

  it('returns non-zero relationship axes when edges exist in state', () => {
    const key = buildRelationshipKey('player', 'npc-ida-rhys')
    const state = stateWithIda({
      relationships: { [key]: { affinity: 30, respect: 10, fear: 0, trust: 20, loyalty: 45 } },
    })
    const result = selectFullNpcProfile(state as never, 'npc-ida-rhys')
    expect(result!.playerToNpc.loyalty).toBe(45)
    expect(result!.playerToNpc.trust).toBe(20)
  })

  it('includes heirStatus when the NPC is a recognized heir', () => {
    const state = stateWithIda({
      house: {
        ...initialGameStateSnapshot.house,
        houseHeirs: [
          {
            id: 'npc-ida-rhys',
            name: 'Ida Rhys',
            originStory: 'Fostered',
            stage: 'ward' as const,
            arrivalDay: 1,
            legitimacyStatus: 'recognized' as const,
            birthContext: null,
          },
        ],
      },
    })
    const result = selectFullNpcProfile(state as never, 'npc-ida-rhys')
    expect(result!.heirStatus).not.toBeNull()
    expect(result!.heirStatus!.stage).toBe('ward')
    expect(result!.heirStatus!.legitimacyStatus).toBe('recognized')
  })

  it('returns null heirStatus when NPC is not a recognized heir', () => {
    const result = selectFullNpcProfile(stateWithIda() as never, 'npc-ida-rhys')
    expect(result!.heirStatus).toBeNull()
  })

  it('includes bondStatus from runtime state', () => {
    const withBond = {
      ...idaRhysRosterEntry,
      bondStatus: {
        holderId: 'player',
        contractValue: 40,
        termDays: 30,
        entryReason: 'debt-settlement' as const,
        alongsideFreeAssignmentDays: 0,
        lastEqualityNoticeDay: null,
        forSale: false,
        lastOfferDay: null,
        marketValue: 0,
        ownerType: 'player' as const,
        bondStartDay: 0,
      },
    }
    const state = stateWithIda({ npcRuntimeStates: [withBond] })
    const result = selectFullNpcProfile(state as never, 'npc-ida-rhys')
    expect(result!.bondStatus).not.toBeNull()
    expect(result!.bondStatus!.entryReason).toBe('debt-settlement')
  })

  it('returns null combatSnapshot when no active combat', () => {
    const result = selectFullNpcProfile(stateWithIda() as never, 'npc-ida-rhys')
    expect(result!.combatSnapshot).toBeNull()
  })
})
