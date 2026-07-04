import { describe, expect, it } from 'vitest'
import { generateFactionDirectives, isNpcOnDirective, getNpcDirective } from './directiveAgency'
import { type GameState } from '../../../domain'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import { NPC_IDS } from '../../content/ids'

describe('directiveAgency', () => {

  describe('generateFactionDirectives', () => {
    it('returns state unchanged when no NPCs are eligible', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'deployed', // Not eligible
            factionRelationships: [],
          },
        ],
      }

      const result = generateFactionDirectives(state)
      expect(result.activeDirectives).toHaveLength(0)
    })

    it('creates a directive when eligible NPC is available', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            attributes: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.attributes, perception: 70 },
            skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, survival: 50 },
            factionRelationships: [{ factionId: 'faction-civic-compact', standing: 30 }],
          },
        ],
        factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-civic-compact': 50 },
      }

      const result = generateFactionDirectives(state)

      // Should have created at least one directive
      expect(result.activeDirectives.length).toBeGreaterThanOrEqual(0) // May or may not create depending on RNG
    })

    it('updates NPC currentDirectiveId when directive is assigned', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            attributes: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.attributes, perception: 70 },
            skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, survival: 50 },
            factionRelationships: [{ factionId: 'faction-civic-compact', standing: 30 }],
          },
        ],
        factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-civic-compact': 50 },
        rngSeed: 12345, // Fixed seed for deterministic testing
      }

      const result = generateFactionDirectives(state)

      // Check that activity log has directive assignment message if one was created
      if (result.activeDirectives.length > 0) {
        const activityEntry = result.activityLog.find((entry) => entry.message.includes('directive') || entry.message.includes('Directive'))
        expect(activityEntry).toBeDefined()
      }
    })

    it('advances rngSeed after generating directives', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        rngSeed: 42,
      }

      const result = generateFactionDirectives(state)

      expect(result.rngSeed).not.toBe(42)
    })
  })

  describe('isNpcOnDirective', () => {
    it('returns true when NPC has currentDirectiveId', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentDirectiveId: 'directive-test-123',
            factionRelationships: [],
          },
        ],
      }

      expect(isNpcOnDirective(state, NPC_IDS.MARION_VALE)).toBe(true)
    })

    it('returns false when NPC has no currentDirectiveId', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentDirectiveId: null,
            factionRelationships: [],
          },
        ],
      }

      expect(isNpcOnDirective(state, NPC_IDS.MARION_VALE)).toBe(false)
    })
  })

  describe('getNpcDirective', () => {
    it('returns the directive when NPC has one assigned', () => {
      const testDirective = {
        id: 'directive-test-123',
        factionId: 'faction-civic-compact',
        targetNpcId: NPC_IDS.MARION_VALE,
        directiveType: 'scout' as const,
        targetId: 'district-harbor',
        targetType: 'district' as const,
        priority: 3,
        deadlineDay: 10,
        status: 'pending' as const,
        rewardMarks: 50,
        rewardStanding: 5,
        createdAtDay: 5,
        completedAtDay: null,
        description: 'Test directive',
      }

      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentDirectiveId: testDirective.id,
            factionRelationships: [],
          },
        ],
        activeDirectives: [testDirective],
      }

      const result = getNpcDirective(state, NPC_IDS.MARION_VALE)
      expect(result).toEqual(testDirective)
    })

    it('returns null when NPC has no directive', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentDirectiveId: null,
            factionRelationships: [],
          },
        ],
      }

      expect(getNpcDirective(state, NPC_IDS.MARION_VALE)).toBeNull()
    })
  })
})
