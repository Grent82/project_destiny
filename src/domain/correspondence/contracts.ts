import { z } from 'zod'
import { entityIdSchema, positiveIntegerSchema } from '../shared/contracts'
import { intimacyStageSchema } from '../relationships/contracts'

/**
 * Correspondence domain - Private letter system between NPCs and player
 *
 * Why: Private correspondence is a first-class medium for intimacy, intrigue,
 * and manipulation. Letters carry provenance, sensitivity, and can be
 * discovered, intercepted, forged, or weaponized.
 *
 * Fiction contract: Letters are physical, traceable, and weaponizable. NPCs
 * write to each other independently of the player. The emotional/sensual
 * register is determined by actual relationship depth, never generic.
 */

export const correspondenceSensitivitySchema = z.enum([
  'mundane',
  'political',
  'intimate',
  'compromising',
])
export type CorrespondenceSensitivity = z.infer<typeof correspondenceSensitivitySchema>

export const correspondenceStatusSchema = z.enum([
  'sent',
  'delivered',
  'intercepted',
  'read',
  'suppressed',
  'forged',
])
export type CorrespondenceStatus = z.infer<typeof correspondenceStatusSchema>

export const correspondenceMessageSchema = z
  .object({
    id: entityIdSchema,
    fromId: z.string().min(1),
    toId: z.string().min(1),
    sentOnDay: positiveIntegerSchema,
    deliveredOnDay: positiveIntegerSchema.nullable(),
    text: z.string().min(1),
    modulesUsed: z.array(z.string()).default([]),
    templateFamily: z.string().optional(),
    intimacyStageAtSend: intimacyStageSchema.optional(),
    sensitivity: correspondenceSensitivitySchema,
    status: correspondenceStatusSchema.default('sent'),
    authenticity: z.number().min(0).max(100).default(100),
    knownBy: z.array(z.string()).default([]),
    interceptedBy: z.string().nullable().default(null),
    consequenceApplied: z.boolean().default(false),
    isPlayerTarget: z.boolean().default(false), // letter is addressed to player
  })
  .strict()

export type CorrespondenceMessage = z.infer<typeof correspondenceMessageSchema>

/**
 * Pure helper: build a canonical key for correspondence lookup
 */
export function buildCorrespondenceKey(fromId: string, toId: string): string {
  const [a, b] = [fromId, toId].sort()
  return `${a}↔${b}`
}

/**
 * Pure helper: find correspondence between two parties (bidirectional)
 */
export function findCorrespondenceBetween(
  correspondence: CorrespondenceMessage[],
  npcId1: string,
  npcId2: string
): CorrespondenceMessage[] {
  return correspondence.filter(
    (msg) =>
      (msg.fromId === npcId1 && msg.toId === npcId2) ||
      (msg.fromId === npcId2 && msg.toId === npcId1)
  )
}

/**
 * Pure helper: find blackmailable correspondence for a holder
 */
export function findBlackmailableCorrespondence(
  correspondence: CorrespondenceMessage[],
  holderId: string
): CorrespondenceMessage[] {
  return correspondence.filter(
    (msg) =>
      (msg.fromId === holderId || msg.toId === holderId) &&
      (msg.sensitivity === 'compromising' || msg.sensitivity === 'intimate') &&
      !msg.consequenceApplied &&
      msg.authenticity >= 80
  )
}
