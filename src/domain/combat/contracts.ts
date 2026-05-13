import { z } from 'zod'

import {
  combatRangeSchema,
  entityIdSchema,
  percentageSchema,
  positiveIntegerSchema,
} from '../shared/contracts'

export const combatSideSchema = z.enum(['allies', 'enemies'])

export const combatOutcomeSchema = z.enum(['ongoing', 'victory', 'defeat'])

export const combatActionSchema = z.enum(['attack', 'advance', 'retreat', 'guard'])

export const combatLogEntrySchema = z
  .object({
    round: positiveIntegerSchema,
    actorId: entityIdSchema,
    summary: z.string().min(1),
  })
  .strict()

export const combatantStateSchema = z
  .object({
    combatantId: entityIdSchema,
    sourceNpcId: entityIdSchema.nullable(),
    name: z.string().min(1),
    side: combatSideSchema,
    maxHealth: positiveIntegerSchema,
    health: z.number().int().min(0),
    morale: percentageSchema,
    skill: percentageSchema,
    accuracy: percentageSchema,
    damageMin: positiveIntegerSchema,
    damageMax: positiveIntegerSchema,
    effectiveRange: combatRangeSchema,
    soak: percentageSchema,
    speed: positiveIntegerSchema,
    guarding: z.boolean(),
    staggered: z.boolean(),
    guardCooldown: z.boolean().default(false),
    equippedWeaponId: entityIdSchema.nullable(),
    equippedArmorId: entityIdSchema.nullable(),
    lore: z.string().optional(),
    creatureType: z.enum(['human', 'beast', 'undead', 'corrupted']).optional(),
  })
  .strict()
  .superRefine((combatant, context) => {
    if (combatant.health > combatant.maxHealth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'health cannot exceed maxHealth',
        path: ['health'],
      })
    }

    if (combatant.damageMax < combatant.damageMin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'damageMax must be greater than or equal to damageMin',
        path: ['damageMax'],
      })
    }
  })

export const combatSourceTypeSchema = z.enum(['quest', 'expedition', 'district', 'scripted'])

export const combatProvenanceSchema = z.object({
  sourceType: combatSourceTypeSchema,
  linkedQuestId: z.string().nullable().default(null),
  linkedMissionId: z.string().nullable().default(null),
  linkedFactionId: z.string().nullable().default(null),
  districtId: z.string().nullable().default(null),
  destinationId: z.string().nullable().default(null),
  enemyTemplateIds: z.array(z.string()).default([]),
  enemyDefinitionIds: z.array(z.string()).default([]),
}).strict()

export const activeCombatStateSchema = z
  .object({
    encounterId: entityIdSchema,
    round: positiveIntegerSchema,
    range: combatRangeSchema,
    outcome: combatOutcomeSchema,
    activeCombatantId: entityIdSchema.nullable(),
    combatants: z.array(combatantStateSchema).min(2),
    log: z.array(combatLogEntrySchema),
    // Legacy fields (kept for backward compat)
    factionId: entityIdSchema.optional(),
    linkedQuestId: z.string().nullable().optional(),
    // Explicit provenance — new canonical source of truth
    provenance: combatProvenanceSchema.nullable().default(null),
  })
  .strict()

export type ActiveCombatState = z.infer<typeof activeCombatStateSchema>
export type CombatAction = z.infer<typeof combatActionSchema>
export type CombatLogEntry = z.infer<typeof combatLogEntrySchema>
export type CombatOutcome = z.infer<typeof combatOutcomeSchema>
export type CombatSide = z.infer<typeof combatSideSchema>
export type CombatantState = z.infer<typeof combatantStateSchema>
export type CombatSourceType = z.infer<typeof combatSourceTypeSchema>
export type CombatProvenance = z.infer<typeof combatProvenanceSchema>
