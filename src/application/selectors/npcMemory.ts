import { createSelector } from '@reduxjs/toolkit'

import type { GameState, NpcMemoryEntry, NpcMemoryVisibility } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

const PLAYER_ID = 'player'

/**
 * Memory visibility thresholds based on relationship axes.
 * Defines what levels of trust/affinity are needed to see each visibility level.
 */
const VISIBILITY_THRESHOLDS: Record<NpcMemoryVisibility, { trust?: number; affinity?: number; intimacyStage?: string }> = {
  hidden: { trust: 80 }, // Only the NPC themselves can see hidden memories (handled separately)
  trusted: { trust: 50 }, // High trust required
  open: { affinity: 30 }, // Moderate affinity required
  public: {}, // Anyone can see public memories
}

/**
 * Determines if a viewer can see a memory based on visibility level and relationship.
 */
function canViewMemory(
  viewerId: string,
  npcId: string,
  memory: NpcMemoryEntry,
  relationships: GameState['relationships'],
  intimacyStage?: string,
): boolean {
  // Player can always see their own memories
  if (viewerId === PLAYER_ID && npcId === PLAYER_ID) return true

  // NPCs can always see their own memories
  if (viewerId === npcId) return true

  const visibility = memory.visibility ?? 'open'
  const thresholds = VISIBILITY_THRESHOLDS[visibility]

  // Public memories are visible to everyone
  if (visibility === 'public') return true

  // Get relationship from viewer to NPC (how much viewer knows about NPC)
  const viewerToNpcKey = buildRelationshipKey(viewerId, npcId)
  const relationship = relationships[viewerToNpcKey]

  // Check trust threshold for hidden/trusted memories
  if (thresholds.trust !== undefined) {
    if ((relationship?.trust ?? 0) >= thresholds.trust) return true
  }

  // Check affinity threshold for open memories
  if (thresholds.affinity !== undefined) {
    if ((relationship?.affinity ?? 0) >= thresholds.affinity) return true
  }

  // Check intimacy stage if specified
  if (thresholds.intimacyStage !== undefined) {
    if (intimacyStage === thresholds.intimacyStage || intimacyStage === 'committed') return true
  }

  // Default: check if viewer has any meaningful relationship with NPC
  if (visibility === 'open') {
    return (relationship?.affinity ?? 0) >= 0
  }

  return false
}

/**
 * Selector that returns memories visible to a specific viewer.
 *
 * Usage in components:
 * const visibleMemories = useAppSelector((state) => getVisibleMemoriesForNpc(state, npcId, 'player'))
 */
export const getVisibleMemoriesForNpc = createSelector(
  [
    (state: GameState) => state.roster,
    (state: GameState) => state.relationships,
    (_: GameState, npcId: string) => npcId,
    (_: GameState, __: string, viewerId: string) => viewerId,
  ],
  (roster, relationships, npcId, viewerId) => {
    const npc = roster.find((n) => n.npcId === npcId)
    if (!npc) return []

    // Get intimacy stage for this NPC (if viewer is player)
    let intimacyStage: string | undefined
    if (viewerId === PLAYER_ID) {
      const key = buildRelationshipKey(PLAYER_ID, npcId)
      intimacyStage = relationships[key]?.intimacyStage
    }

    // Filter memories based on visibility
    return npc.npcMemory.filter((memory) =>
      canViewMemory(viewerId, npcId, memory, relationships, intimacyStage),
    )
  },
)

/**
 * Selector that returns all memories for an NPC (admin/debug view).
 */
export const getAllMemoriesForNpc = createSelector(
  [(state: GameState) => state.roster, (_: GameState, npcId: string) => npcId],
  (roster, npcId) => {
    const npc = roster.find((n) => n.npcId === npcId)
    return npc?.npcMemory ?? []
  },
)

/**
 * Selector that returns memories grouped by sentiment.
 */
export const getMemoriesBySentiment = createSelector(
  [getVisibleMemoriesForNpc],
  (memories) => {
    return {
      positive: memories.filter((m) => m.sentiment === 'positive'),
      neutral: memories.filter((m) => m.sentiment === 'neutral'),
      negative: memories.filter((m) => m.sentiment === 'negative'),
      traumatic: memories.filter((m) => m.sentiment === 'traumatic'),
    }
  },
)

/**
 * Selector that returns the most recent memories.
 */
export const getRecentMemories = createSelector(
  [getVisibleMemoriesForNpc, (_: GameState, __: string, ___: string, limit: number = 10) => limit],
  (memories, limit) => {
    return memories
      .sort((a, b) => b.day - a.day)
      .slice(0, limit)
  },
)
