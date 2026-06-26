import { z } from 'zod'

import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema } from '../shared/contracts'

/**
 * Types of threats encountered in corridor expeditions.
 */
export const threatTypeSchema = z.enum(['monster', 'bandit', 'scavenger', 'wild_beast'])
export type ThreatType = z.infer<typeof threatTypeSchema>

/**
 * Combat stats for a threat profile.
 */
export const threatCombatStatsSchema = z.object({
  health: positiveIntegerSchema,
  attack: positiveIntegerSchema,
  defense: positiveIntegerSchema,
  evasion: nonNegativeIntegerSchema,
})
export type ThreatCombatStats = z.infer<typeof threatCombatStatsSchema>

/**
 * Skills for humanoid threats (bandits, scavengers).
 */
export const threatSkillsSchema = z.object({
  melee: nonNegativeIntegerSchema.default(0),
  ranged: nonNegativeIntegerSchema.default(0),
  stealth: nonNegativeIntegerSchema.default(0),
})
export type ThreatSkills = z.infer<typeof threatSkillsSchema>

/**
 * A threat profile defining an enemy type for corridor expeditions.
 */
export const threatProfileSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1),
  threatType: threatTypeSchema,
  combatStats: threatCombatStatsSchema,
  skills: threatSkillsSchema.optional().default({ melee: 0, ranged: 0, stealth: 0 }),
  traits: z.array(z.string().min(1)).default([]),
  lootTable: z.array(entityIdSchema).default([]),
  experienceValue: nonNegativeIntegerSchema.default(0),
  description: z.string().optional(),
})
export type ThreatProfile = z.infer<typeof threatProfileSchema>

const discoveryEntrySchema = z.object({
  type: z.enum(['item', 'lore', 'marks']),
  itemId: z.string().optional(),
  loreKey: z.string().optional(),
  label: z.string().optional(),
  amount: z.number().optional(),
  weight: z.number(),
})

export const expeditionDestinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  durationDays: z.number(),
  dangerLevel: z.number(),
  supplyConsumptionPerDay: z.number(),
  encounterEnemyIds: z.array(z.string()),
  discoveryTable: z.array(discoveryEntrySchema),
  narrativeHook: z.string().optional(),
})

export type ExpeditionDestination = z.infer<typeof expeditionDestinationSchema>

export const expeditionEncounterSchema = z.object({
  day: z.number(),
  type: z.enum(['combat', 'event', 'discovery', 'none']),
  label: z.string(),
  resolved: z.boolean().default(false),
})

export type ExpeditionEncounter = z.infer<typeof expeditionEncounterSchema>

export const expeditionDiscoverySchema = z.object({
  type: z.enum(['item', 'lore', 'marks']),
  itemId: z.string().optional(),
  loreKey: z.string().optional(),
  label: z.string().optional(),
  amount: z.number().optional(),
})

export type ExpeditionDiscovery = z.infer<typeof expeditionDiscoverySchema>

export const expeditionStateSchema = z.object({
  status: z.enum(['idle', 'preparing', 'traveling', 'returned']).default('idle'),
  destinationId: z.string().nullable().default(null),
  squadNpcIds: z.array(z.string()).default([]),
  suppliesRemaining: z.number().default(0),
  daysDeparted: z.number().default(0),
  totalDays: z.number().default(0),
  encounters: z.array(expeditionEncounterSchema).default([]),
  discoveries: z.array(expeditionDiscoverySchema).default([]),
  cityDayAtDeparture: z.number().default(0),
})

export type ExpeditionState = z.infer<typeof expeditionStateSchema>

/**
 * Status of a corridor group.
 */
export const groupStatusSchema = z.enum(['forming', 'departed', 'active', 'returning', 'concluded'])
export type GroupStatus = z.infer<typeof groupStatusSchema>

/**
 * Role of a member in a corridor group.
 */
export const groupRoleSchema = z.enum(['leader', 'vanguard', 'support', 'scout'])
export type GroupRole = z.infer<typeof groupRoleSchema>

/**
 * Membership status in a corridor group.
 */
export const groupMemberStatusSchema = z.enum(['committed', 'injured', 'dead', 'withdrew'])
export type GroupMemberStatus = z.infer<typeof groupMemberStatusSchema>

/**
 * A member of a corridor group.
 */
export const groupMemberSchema = z.object({
  npcId: entityIdSchema,
  role: groupRoleSchema,
  contribution: nonNegativeIntegerSchema.default(0),
  status: groupMemberStatusSchema.default('committed'),
})
export type GroupMember = z.infer<typeof groupMemberSchema>

/**
 * A corridor group - a group of NPCs organized to clear the corridor.
 * Note: This is NOT a factional coalition - just an NPC group without faction structure.
 */
export const corridorGroupSchema = z.object({
  id: entityIdSchema,
  status: groupStatusSchema,
  members: z.array(groupMemberSchema).default([]),
  formedDay: positiveIntegerSchema,
  targetSegment: z.string().min(1).default('main-corridor'),
  difficulty: positiveIntegerSchema.default(5),
  progress: z.number().min(0).max(100).default(0),
  estimatedReturnDay: positiveIntegerSchema,
  tollRights: z.object({
    holder: z.string().min(1),
    rate: z.number().min(0).max(100),
  }).optional(),
})
export type CorridorGroup = z.infer<typeof corridorGroupSchema>

/**
 * Status of a corridor expedition.
 */
export const expeditionStatusSchema = z.enum(['pending', 'in-progress', 'success', 'partial', 'failure'])
export type ExpeditionStatus = z.infer<typeof expeditionStatusSchema>

/**
 * Combat round result in an expedition encounter.
 */
export const expeditionCombatRoundSchema = z.object({
  round: positiveIntegerSchema,
  groupDamageDealt: nonNegativeIntegerSchema.default(0),
  threatDamageDealt: nonNegativeIntegerSchema.default(0),
  groupCasualties: z.array(entityIdSchema).default([]),
  threatCasualties: z.array(entityIdSchema).default([]),
})
export type ExpeditionCombatRound = z.infer<typeof expeditionCombatRoundSchema>

/**
 * An encounter during a corridor expedition.
 */
export const corridorExpeditionEncounterSchema = z.object({
  encounterNumber: positiveIntegerSchema,
  threatIds: z.array(entityIdSchema),
  difficulty: positiveIntegerSchema,
  roundResults: z.array(expeditionCombatRoundSchema).default([]),
  result: z.enum(['victory', 'defeat', 'withdrawal']).optional(),
})
export type CorridorExpeditionEncounter = z.infer<typeof corridorExpeditionEncounterSchema>

/**
 * A corridor expedition - the actual mission run by a group.
 */
export const corridorExpeditionSchema = z.object({
  id: entityIdSchema,
  groupId: entityIdSchema,
  status: expeditionStatusSchema,
  segment: z.string().min(1).default('main-corridor'),
  encounters: z.array(corridorExpeditionEncounterSchema).default([]),
  currentProgress: z.number().min(0).max(100).default(0),
  casualties: z.array(z.object({
    npcId: entityIdSchema,
    status: z.enum(['dead', 'injured']),
  })).default([]),
  lootAcquired: z.array(entityIdSchema).default([]),
  conclusionDay: positiveIntegerSchema.optional(),
})
export type CorridorExpedition = z.infer<typeof corridorExpeditionSchema>
