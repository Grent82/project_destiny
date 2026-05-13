import { z } from 'zod'

export const relationshipAxesSchema = z.object({
  affinity: z.number().min(-100).max(100).default(0),
  respect: z.number().min(-100).max(100).default(0),
  fear: z.number().min(-100).max(100).default(0),
  trust: z.number().min(-100).max(100).default(0),
  loyalty: z.number().min(-100).max(100).default(0),
})

export type RelationshipAxes = z.infer<typeof relationshipAxesSchema>

/** Directed key: '{fromId}→{toId}'. fromId is the feeler; toId is the target. */
export function buildRelationshipKey(fromId: string, toId: string): string {
  return `${fromId}→${toId}`
}

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

/**
 * Get the directed relationship from `fromId` to `toId`.
 * Returns empty axes if no edge exists.
 */
export function getRelationship(
  relationships: Record<string, RelationshipAxes>,
  fromId: string,
  toId: string,
): RelationshipAxes {
  return relationships[buildRelationshipKey(fromId, toId)] ?? EMPTY_AXES
}

/**
 * Get both directed edges between two parties.
 * Useful for display or symmetry checks.
 */
export function getSymmetricRelationship(
  relationships: Record<string, RelationshipAxes>,
  aId: string,
  bId: string,
): { ab: RelationshipAxes; ba: RelationshipAxes } {
  return {
    ab: getRelationship(relationships, aId, bId),
    ba: getRelationship(relationships, bId, aId),
  }
}
