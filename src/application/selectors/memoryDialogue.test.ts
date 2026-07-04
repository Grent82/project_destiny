import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import {
  getMemoryDialogueTopicsForNpc,
  hasMemoryType,
  getRecentMemoryOfType,
} from './memoryDialogue'
import { idaRhysRosterEntry } from '../commands/testFixtures'

describe('Memory Dialogue Selector', () => {
  const createTestState = (memories = idaRhysRosterEntry.npcMemory): GameState => ({
    ...JSON.parse(
      JSON.stringify({
        npcRuntimeStates: [{ ...idaRhysRosterEntry, npcMemory: memories }],
        relationships: {
          'player|npc-ida-rhys': {
            affinity: 45,
            trust: 55,
            respect: 30,
            loyalty: 40,
            fear: 10,
            intimacyStage: 'attachment',
          },
        },
        currentDistrictId: 'the-pale',
        day: 15,
        debtPaid: false,
        playerCharacter: { renown: 30 },
        mainQuest: { stage: 'intro', lastClue: null },
        factionStandings: {},
        ownedItems: [],
        availableQuestLeads: [],
        activityLog: [],
        resolvedDialogueChoices: {},
        visitedDialogueNodes: {},
        activeDialogueId: null,
        activeDialogueNodeId: null,
        titleDefinitions: [],
        rosterSizeLimit: 10,
      }),
    ),
  })

  describe('getMemoryDialogueTopicsForNpc', () => {
    it('returns empty array when NPC has no memories', () => {
      const state = createTestState([])
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      expect(topics).toEqual([])
    })

    it('returns dialogue topics for each unique memory type', () => {
      const memories = [
        {
          day: 5,
          event: 'first_meeting',
          eventType: 'first_meeting' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
        {
          day: 10,
          event: 'training',
          eventType: 'training' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
        {
          day: 12,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      expect(topics).toHaveLength(3)
      expect(topics.map((t) => t.memoryEvent)).toEqual(['combat', 'training', 'first_meeting'])
    })

    it('returns topics sorted by recency (newest first)', () => {
      const memories = [
        {
          day: 3,
          event: 'first_meeting',
          eventType: 'first_meeting' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
        {
          day: 12,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
        {
          day: 8,
          event: 'training',
          eventType: 'training' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      expect(topics[0]?.memoryDay).toBe(12)
      expect(topics[1]?.memoryDay).toBe(8)
      expect(topics[2]?.memoryDay).toBe(3)
    })

    it('maps memory events to correct dialogue labels', () => {
      const memories = [
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
        {
          day: 8,
          event: 'courtship',
          eventType: 'courtship' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)
      // Set intimacy stage to 'committed' to avoid attachment modifier on courtship
      state.relationships['player|npc-ida-rhys']!.intimacyStage = 'committed'
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      const combatTopic = topics.find((t) => t.memoryEvent === 'combat')
      const courtshipTopic = topics.find((t) => t.memoryEvent === 'courtship')

      expect(combatTopic?.topicLabel).toBe('Talk about recent combat')
      expect(courtshipTopic?.topicLabel).toBe('Reflect on our time together')
    })

    it('includes trust and affinity requirements from mapping', () => {
      const memories = [
        {
          day: 10,
          event: 'betrayal',
          eventType: 'betrayal' as const,
          visibility: 'open' as const,
          sentiment: 'negative' as const,
        },
        {
          day: 8,
          event: 'gift_received',
          eventType: 'gift_received' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      const betrayalTopic = topics.find((t) => t.memoryEvent === 'betrayal')
      const giftTopic = topics.find((t) => t.memoryEvent === 'gift_received')

      expect(betrayalTopic?.minTrust).toBe(60)
      expect(giftTopic?.minAffinity).toBe(10)
    })

    it('includes sentiment from memory', () => {
      const memories = [
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'traumatic' as const,
        },
        {
          day: 8,
          event: 'training',
          eventType: 'training' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      const combatTopic = topics.find((t) => t.memoryEvent === 'combat')
      const trainingTopic = topics.find((t) => t.memoryEvent === 'training')

      expect(combatTopic?.sentiment).toBe('traumatic')
      expect(trainingTopic?.sentiment).toBe('positive')
    })

    it('returns only most recent memory when multiple of same type exist', () => {
      const memories = [
        {
          day: 5,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'negative' as const,
        },
        {
          day: 12,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      const combatTopic = topics.find((t) => t.memoryEvent === 'combat')
      expect(combatTopic?.memoryDay).toBe(12)
      expect(combatTopic?.sentiment).toBe('positive')
    })

    it('handles all supported memory event types', () => {
      const memories = [
        { day: 1, event: 'quest_completion', eventType: 'quest_completion' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 2, event: 'gift_given', eventType: 'gift_given' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 3, event: 'intimacy', eventType: 'intimacy' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 4, event: 'help_received', eventType: 'help_received' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 5, event: 'conversation_deep', eventType: 'conversation_deep' as const, visibility: 'open' as const, sentiment: 'neutral' as const },
        { day: 6, event: 'work_completed', eventType: 'work_completed' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 7, event: 'directive_completed', eventType: 'directive_completed' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 8, event: 'promotion', eventType: 'promotion' as const, visibility: 'open' as const, sentiment: 'positive' as const },
        { day: 9, event: 'injury_treated', eventType: 'injury_treated' as const, visibility: 'open' as const, sentiment: 'neutral' as const },
        { day: 10, event: 'loss', eventType: 'loss' as const, visibility: 'open' as const, sentiment: 'traumatic' as const },
      ]
      const state = createTestState(memories)
      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      expect(topics).toHaveLength(10)
      const topicLabels = topics.map((t) => t.topicLabel)
      expect(topicLabels).toContain('Discuss the completed mission')
      expect(topicLabels).toContain('Remember the gift you gave')
      expect(topicLabels).toContain('Speak of our closeness')
      expect(topicLabels).toContain('I still remember your help')
      expect(topicLabels).toContain('Continue where we left off')
      expect(topicLabels).toContain('Discuss our recent work')
      expect(topicLabels).toContain('Mission accomplished')
      expect(topicLabels).toContain('Reflect on how far we\'ve come')
      expect(topicLabels).toContain('How are you feeling now?')
      expect(topicLabels).toContain('I need to talk about what we lost')
    })

    it('applies intimacy stage modifiers to labels', () => {
      const stateWithCommitted = createTestState([
        {
          day: 10,
          event: 'intimacy',
          eventType: 'intimacy' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ])
      // Override intimacy stage to committed
      stateWithCommitted.relationships['player|npc-ida-rhys']!.intimacyStage = 'committed'

      const topics = getMemoryDialogueTopicsForNpc(stateWithCommitted.npcRuntimeStates, stateWithCommitted.relationships, 'npc-ida-rhys')
      const intimacyTopic = topics.find((t) => t.memoryEvent === 'intimacy')

      expect(intimacyTopic?.topicLabel).toBe('Speak intimately about us')
    })

    it('filters memories based on visibility thresholds', () => {
      const memories = [
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
        {
          day: 8,
          event: 'betrayal',
          eventType: 'betrayal' as const,
          visibility: 'hidden' as const,
          sentiment: 'negative' as const,
        },
      ]
      // Low trust relationship - hidden memories should not be visible
      const state = createTestState(memories)
      state.relationships['player|npc-ida-rhys']!.trust = 30

      const topics = getMemoryDialogueTopicsForNpc(state.npcRuntimeStates, state.relationships, 'npc-ida-rhys')

      // Only combat should be visible (betrayal is hidden and requires trust >= 80)
      expect(topics).toHaveLength(1)
      expect(topics[0]?.memoryEvent).toBe('combat')
    })
  })

  describe('hasMemoryType', () => {
    it('returns true when NPC has the memory type', () => {
      const memories = [
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
      ]
      const state = createTestState(memories)

      expect(hasMemoryType(state, 'npc-ida-rhys', 'combat')).toBe(true)
    })

    it('returns false when NPC does not have the memory type', () => {
      const memories = [
        {
          day: 10,
          event: 'training',
          eventType: 'training' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)

      expect(hasMemoryType(state, 'npc-ida-rhys', 'combat')).toBe(false)
    })
  })

  describe('getRecentMemoryOfType', () => {
    it('returns the most recent memory of the specified type', () => {
      const memories = [
        {
          day: 5,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'neutral' as const,
        },
        {
          day: 10,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
        {
          day: 8,
          event: 'combat',
          eventType: 'combat' as const,
          visibility: 'open' as const,
          sentiment: 'negative' as const,
        },
      ]
      const state = createTestState(memories)

      const recent = getRecentMemoryOfType(state, 'npc-ida-rhys', 'combat')

      expect(recent?.day).toBe(10)
      expect(recent?.sentiment).toBe('positive')
    })

    it('returns undefined when no memory of that type exists', () => {
      const memories = [
        {
          day: 10,
          event: 'training',
          eventType: 'training' as const,
          visibility: 'open' as const,
          sentiment: 'positive' as const,
        },
      ]
      const state = createTestState(memories)

      const recent = getRecentMemoryOfType(state, 'npc-ida-rhys', 'combat')

      expect(recent).toBeUndefined()
    })
  })
})
