import { createSelector } from '@reduxjs/toolkit'

import type { GameState, NpcMemoryEntry } from '../../domain'
import { getVisibleMemoriesForNpc } from './npcMemory'

/**
 * Mapping of memory event types to dialogue topic labels.
 * These are the conversation starters NPCs can use based on their memories.
 */
const MEMORY_TO_DIALOGUE_TOPIC: Record<string, { label: string; minTrust?: number; minAffinity?: number }> = {
  // Combat-related memories
  combat: { label: 'Talk about recent combat', minTrust: 30 },
  quest_completion: { label: 'Discuss the completed mission', minTrust: 20 },

  // Gift and exchange memories
  gift_given: { label: 'Remember the gift you gave', minAffinity: 20 },
  gift_received: { label: 'Thank you for the thoughtful gift', minAffinity: 10 },

  // Relationship milestones
  courtship: { label: 'Reflect on our time together', minAffinity: 40 },
  intimacy: { label: 'Speak of our closeness', minAffinity: 60 },
  pairing_formed: { label: 'About us as a pair', minAffinity: 50 },
  pairing_broken: { label: 'What went wrong between us', minTrust: 40 },

  // Trust and vulnerability
  betrayal: { label: 'Address what happened', minTrust: 60 },
  help_received: { label: 'I still remember your help', minTrust: 30 },
  help_given: { label: 'Remember when I helped you', minAffinity: 30 },

  // Conversation memories
  conversation_deep: { label: 'Continue where we left off', minTrust: 40 },
  conversation_casual: { label: 'Casual catch-up', minAffinity: 10 },

  // Work and duty
  work_completed: { label: 'Discuss our recent work', minTrust: 20 },
  directive_assigned: { label: 'About the orders we received', minTrust: 15 },
  directive_completed: { label: 'Mission accomplished', minTrust: 25 },
  directive_failed: { label: 'What went wrong on that mission', minTrust: 35 },

  // Personal milestones
  first_meeting: { label: 'Remember when we first met', minAffinity: 20 },
  training: { label: 'Talk about our training', minAffinity: 15 },
  promotion: { label: 'Reflect on how far we\'ve come', minTrust: 30 },
  injury_treated: { label: 'How are you feeling now?', minTrust: 40 },

  // Negative experiences
  failed_mission: { label: 'About that failure', minTrust: 50 },
  loss: { label: 'I need to talk about what we lost', minTrust: 60 },

  // Daily life
  day_passed: { label: 'Another day in Valdenmoor', minAffinity: 5 },
  wage_paid: { label: 'About my compensation', minTrust: 25 },

  // Custom events
  custom: { label: 'Share something personal', minTrust: 40 },

  // Default fallback
  default: { label: 'Talk about the past', minTrust: 20 },
}

/**
 * Extract unique memory topics available for an NPC to discuss.
 * Returns dialogue-ready topics based on visible memories and relationship state.
 */
export function getMemoryDialogueTopicsForNpc(
  roster: GameState['npcRuntimeStates'],
  relationships: GameState['relationships'],
  npcId: string,
): Array<{
  memoryEvent: string
  memoryDay: number
  topicLabel: string
  minTrust?: number
  minAffinity?: number
  sentiment: string
}> {
  const memories = getVisibleMemoriesForNpc.resultFunc(
    roster,
    relationships,
    npcId,
    'player',
  )

  if (memories.length === 0) return []

  // Get intimacy stage for this NPC
  const key = `player|${npcId}`
  const intimacyStage = relationships[key]?.intimacyStage

  // Group memories by event type and get the most recent of each
  const memoryByType = new Map<string, NpcMemoryEntry>()
  for (const memory of memories) {
    const existing = memoryByType.get(memory.event)
    if (!existing || memory.day > existing.day) {
      memoryByType.set(memory.event, memory)
    }
  }

  // Convert to dialogue topics
  const topics: Array<{
    memoryEvent: string
    memoryDay: number
    topicLabel: string
    minTrust?: number
    minAffinity?: number
    sentiment: string
  }> = []

  for (const memory of memoryByType.values()) {
    const topicMapping = MEMORY_TO_DIALOGUE_TOPIC[memory.event] ?? MEMORY_TO_DIALOGUE_TOPIC.default
    const topicLabel = topicMapping.label

    // Add intimacy-based modifiers
    let finalLabel = topicLabel
    if (intimacyStage === 'committed' && memory.event === 'intimacy') {
      finalLabel = 'Speak intimately about us'
    } else if (intimacyStage === 'attachment' && memory.event === 'courtship') {
      finalLabel = 'Reflect on our growing bond'
    }

    topics.push({
      memoryEvent: memory.event,
      memoryDay: memory.day,
      topicLabel: finalLabel,
      minTrust: topicMapping.minTrust,
      minAffinity: topicMapping.minAffinity,
      sentiment: memory.sentiment,
    })
  }

  // Sort by recency
  return topics.sort((a, b) => b.memoryDay - a.memoryDay)
}

/**
 * Selector that returns available memory-based conversation topics for an NPC.
 */
export const getAvailableMemoryTopics = createSelector(
  [
    (state: GameState) => state.npcRuntimeStates,
    (state: GameState) => state.relationships,
    (_: GameState, npcId: string) => npcId,
  ],
  (roster, relationships, npcId) => {
    return getMemoryDialogueTopicsForNpc(roster, relationships, npcId)
  },
)

/**
 * Check if an NPC has a specific type of memory that could trigger dialogue.
 */
export function hasMemoryType(state: GameState, npcId: string, eventType: string): boolean {
  const memories = getVisibleMemoriesForNpc.resultFunc(
    state.npcRuntimeStates,
    state.relationships,
    npcId,
    'player',
  )
  return memories.some((m) => m.event === eventType)
}

/**
 * Get the most recent memory of a specific type for an NPC.
 */
export function getRecentMemoryOfType(
  state: GameState,
  npcId: string,
  eventType: string,
): NpcMemoryEntry | undefined {
  const memories = getVisibleMemoriesForNpc.resultFunc(
    state.npcRuntimeStates,
    state.relationships,
    npcId,
    'player',
  )
  return memories
    .filter((m) => m.event === eventType)
    .sort((a, b) => b.day - a.day)[0]
}
