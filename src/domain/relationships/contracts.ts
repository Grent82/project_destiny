import { z } from 'zod'

export const relationshipAxesSchema = z.object({
  affinity: z.number().min(-100).max(100).default(0),
  respect: z.number().min(-100).max(100).default(0),
  fear: z.number().min(-100).max(100).default(0),
  trust: z.number().min(-100).max(100).default(0),
  loyalty: z.number().min(-100).max(100).default(0),
})

export type RelationshipAxes = z.infer<typeof relationshipAxesSchema>

// Key format: "player-{npcId}" for player→NPC, "{npcId1}-{npcId2}" for NPC→NPC (lower ID first)
export function buildRelationshipKey(fromId: string, toId: string): string {
  if (fromId === 'player') return `player-${toId}`
  return [fromId, toId].sort().join('-')
}
