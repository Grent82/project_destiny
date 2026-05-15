import { z } from 'zod'
import { bondVisibilitySchema } from '../rumors/contracts'

export const intimacyStageSchema = z.enum(['none', 'affinity', 'attachment', 'committed'])
export type IntimacyStage = z.infer<typeof intimacyStageSchema>

export const softBondStateSchema = z.object({
  strength: z.number().min(0).max(100),
  since: z.number().int().positive(),
  visibility: bondVisibilitySchema,
})

export const relationshipAxesSchema = z.object({
  affinity: z.number().min(-100).max(100).default(0),
  respect: z.number().min(-100).max(100).default(0),
  fear: z.number().min(-100).max(100).default(0),
  trust: z.number().min(-100).max(100).default(0),
  loyalty: z.number().min(-100).max(100).default(0),
  intimacyStage: intimacyStageSchema.optional(),
  bondType: z.string().optional(),
  legacyIntentActive: z.boolean().optional(),
  hardBond: z.boolean().optional(),
  softBond: softBondStateSchema.optional(),
})

export type RelationshipAxes = z.infer<typeof relationshipAxesSchema>
export type SoftBondState = z.infer<typeof softBondStateSchema>

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
