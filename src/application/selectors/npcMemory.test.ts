import { describe, expect, it } from 'vitest'
import { getVisibleMemoriesForNpc, getAllMemoriesForNpc, getMemoriesBySentiment, getRecentMemories } from './npcMemory'
import type { GameState, NpcMemoryEntry } from '../../domain'
import type { RelationshipAxes } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

describe('npcMemory selectors', () => {
  const createTestState = (
    memories: NpcMemoryEntry[],
    relationships: Record<string, RelationshipAxes> = {},
  ): GameState => ({
    ...initialGameStateSnapshot,
    npcRuntimeStates: [
      {
        ...initialGameStateSnapshot.npcRuntimeStates[0]!,
        npcMemory: memories,
        factionRelationships: [],
      },
    ],
    relationships: {
      [buildRelationshipKey('player', NPC_IDS.MARION_VALE)]: {
        affinity: 50,
        respect: 40,
        fear: 10,
        trust: 60,
        loyalty: 30,
        intimacyStage: 'attachment',
      },
      ...relationships,
    },
  })

  describe('getVisibleMemoriesForNpc', () => {
    it('returns public memories for any viewer', () => {
      const state = createTestState([
        { day: 1, event: 'Meeting', eventType: 'first_meeting', visibility: 'public', sentiment: 'positive' },
      ])

      const visible = getVisibleMemoriesForNpc(state, NPC_IDS.MARION_VALE, 'player')
      expect(visible).toHaveLength(1)
      expect(visible[0]!.event).toBe('Meeting')
    })

    it('returns open memories when viewer has sufficient affinity', () => {
      const state = createTestState([
        { day: 1, event: 'Conversation', eventType: 'conversation_casual', visibility: 'open', sentiment: 'neutral' },
      ])

      const visible = getVisibleMemoriesForNpc(state, NPC_IDS.MARION_VALE, 'player')
      expect(visible).toHaveLength(1)
    })

    it('returns trusted memories when viewer has sufficient trust', () => {
      const state = createTestState([
        { day: 1, event: 'Secret shared', eventType: 'conversation_deep', visibility: 'trusted', sentiment: 'positive' },
      ])

      const visible = getVisibleMemoriesForNpc(state, NPC_IDS.MARION_VALE, 'player')
      expect(visible).toHaveLength(1)
    })

    it('returns hidden memories only with high trust', () => {
      const state = createTestState([
        { day: 1, event: 'Private moment', eventType: 'intimacy', visibility: 'hidden', sentiment: 'positive' },
      ])

      // With trust of 60, should not see hidden memories (needs 80+)
      const visible = getVisibleMemoriesForNpc(state, NPC_IDS.MARION_VALE, 'player')
      expect(visible).toHaveLength(0)
    })

    it('returns empty array when NPC not found', () => {
      const state = createTestState([])

      const visible = getVisibleMemoriesForNpc(state, 'non-existent-npc', 'player')
      expect(visible).toHaveLength(0)
    })

    it('filters public and open memories correctly', () => {
      const memories = [
        { day: 1, event: 'Public event', eventType: 'quest_completion' as const, visibility: 'public' as const, sentiment: 'positive' as const },
        { day: 2, event: 'Open event', eventType: 'conversation_casual' as const, visibility: 'open' as const, sentiment: 'neutral' as const },
      ]
      const state = createTestState(memories)

      const visible = getVisibleMemoriesForNpc(state, NPC_IDS.MARION_VALE, 'player')
      expect(visible).toHaveLength(2)
      const events = visible.map((m) => m.event)
      expect(events).toContain('Public event')
      expect(events).toContain('Open event')
    })
  })

  describe('getAllMemoriesForNpc', () => {
    it('returns all memories regardless of visibility', () => {
      const state = createTestState([
        { day: 1, event: 'Public', eventType: 'custom', visibility: 'public', sentiment: 'positive' },
        { day: 2, event: 'Hidden', eventType: 'custom', visibility: 'hidden', sentiment: 'negative' },
      ])

      const all = getAllMemoriesForNpc(state, NPC_IDS.MARION_VALE)
      expect(all).toHaveLength(2)
    })

    it('returns empty array when NPC not found', () => {
      const state = createTestState([])

      const all = getAllMemoriesForNpc(state, 'non-existent-npc')
      expect(all).toHaveLength(0)
    })
  })

  describe('getMemoriesBySentiment', () => {
    it('groups memories by sentiment', () => {
      const state = createTestState([
        { day: 1, event: 'Good thing', eventType: 'custom', visibility: 'open', sentiment: 'positive' },
        { day: 2, event: 'Neutral thing', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 3, event: 'Bad thing', eventType: 'custom', visibility: 'open', sentiment: 'negative' },
        { day: 4, event: 'Traumatic thing', eventType: 'combat', visibility: 'open', sentiment: 'traumatic' },
      ])

      const bySentiment = getMemoriesBySentiment(state, NPC_IDS.MARION_VALE, 'player')
      expect(bySentiment.positive).toHaveLength(1)
      expect(bySentiment.neutral).toHaveLength(1)
      expect(bySentiment.negative).toHaveLength(1)
      expect(bySentiment.traumatic).toHaveLength(1)
    })

    it('returns empty arrays when no memories', () => {
      const state = createTestState([])

      const bySentiment = getMemoriesBySentiment(state, NPC_IDS.MARION_VALE, 'player')
      expect(bySentiment.positive).toHaveLength(0)
      expect(bySentiment.neutral).toHaveLength(0)
      expect(bySentiment.negative).toHaveLength(0)
      expect(bySentiment.traumatic).toHaveLength(0)
    })
  })

  describe('getRecentMemories', () => {
    it('returns memories sorted by day (newest first)', () => {
      const state = createTestState([
        { day: 1, event: 'Old', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 5, event: 'Newer', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 3, event: 'Middle', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
      ])

      const recent = getRecentMemories(state, NPC_IDS.MARION_VALE, 'player')
      expect(recent[0]!.event).toBe('Newer')
      expect(recent[1]!.event).toBe('Middle')
      expect(recent[2]!.event).toBe('Old')
    })

    it('respects limit parameter', () => {
      const state = createTestState([
        { day: 1, event: '1', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 2, event: '2', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 3, event: '3', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
        { day: 4, event: '4', eventType: 'custom', visibility: 'open', sentiment: 'neutral' },
      ])

      const recent = getRecentMemories(state, NPC_IDS.MARION_VALE, 'player', 2)
      expect(recent).toHaveLength(2)
      expect(recent[0]!.event).toBe('4')
      expect(recent[1]!.event).toBe('3')
    })

    it('defaults to 10 memories', () => {
      const state = createTestState(
        Array.from({ length: 15 }, (_, i) => ({
          day: i + 1,
          event: `Event ${i + 1}`,
          eventType: 'custom' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        })),
      )

      const recent = getRecentMemories(state, NPC_IDS.MARION_VALE, 'player')
      expect(recent).toHaveLength(10)
    })
  })
})
