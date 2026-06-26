import type { AuthoredMemory } from '../../domain/npc/contracts'
import type { NpcMemoryEventType } from '../../domain/npc/contracts'

/**
 * Converts an authored memory into a runtime npcMemoryEntry.
 * Day offset is calculated relative to the current game day.
 */
export function convertAuthoredMemoryToEntry(
  authored: AuthoredMemory,
  currentDay: number,
): {
  day: number
  event: string
  eventType: NpcMemoryEventType
  participants?: string[]
  visibility: 'hidden' | 'trusted' | 'open' | 'public'
  sentiment: 'positive' | 'neutral' | 'negative' | 'traumatic'
} {
  const calculatedDay = currentDay + authored.dayOffset
  const day = calculatedDay > 0 ? calculatedDay : 1 // Clamp to day 1 minimum

  // Map authored event types to runtime memory event types
  const eventTypeMapping: Record<string, NpcMemoryEventType> = {
    house_fall: 'loss',
    betrayal: 'betrayal',
    victory: 'quest_completion',
    failure: 'failed_mission',
    loyalty_test: 'custom',
    failed_mission: 'failed_mission',
    rescue: 'help_received',
    loss: 'loss',
    first_meeting: 'first_meeting',
    training: 'training',
    promotion: 'promotion',
    exile: 'custom',
    return: 'custom',
    custom: 'custom',
  }

  const mappedEventType = eventTypeMapping[authored.eventType] ?? 'custom'

  return {
    day,
    event: authored.description,
    eventType: mappedEventType,
    participants: authored.participants,
    visibility: 'open', // Default visibility; actual visibility checked at display time
    sentiment: authored.sentiment,
  }
}

/**
 * Filters authored memories based on current trust level and intimacy stage.
 * Returns only memories that should be visible to the player.
 */
export function getVisibleAuthoredMemories(
  authoredMemories: AuthoredMemory[],
  trustLevel: number,
  intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed',
): AuthoredMemory[] {
  const intimacyOrder = ['none', 'affinity', 'attachment', 'committed'] as const
  const currentIntimacyIndex = intimacyOrder.indexOf(intimacyStage)

  return authoredMemories.filter((memory) => {
    // Check trust level requirement
    const trustOk = trustLevel >= memory.revealsOnTrustLevel

    // Check intimacy stage requirement
    const intimacyIndex = intimacyOrder.indexOf(memory.revealsOnIntimacy)
    const intimacyOk = currentIntimacyIndex >= intimacyIndex

    return trustOk && intimacyOk
  })
}

/**
 * Calculates potential trait drift from authored memories.
 * Returns trait deltas that should be applied based on visible memories.
 */
export function calculateTraitDriftFromMemories(
  authoredMemories: AuthoredMemory[],
  trustLevel: number,
  intimacyStage: 'none' | 'affinity' | 'attachment' | 'committed',
): Record<string, number> {
  const visible = getVisibleAuthoredMemories(authoredMemories, trustLevel, intimacyStage)

  const totalDrift = visible.reduce((acc, memory) => {
    if (!memory.influencesTraitDrift) return acc

    for (const [trait, delta] of Object.entries(memory.influencesTraitDrift)) {
      acc[trait] = (acc[trait] ?? 0) + delta
    }
    return acc
  }, {} as Record<string, number>)

  return totalDrift
}
