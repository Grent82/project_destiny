import { z } from 'zod'

import { entityIdSchema, nonNegativeIntegerSchema } from '../shared/contracts'

export const siteRuntimeModeSchema = z.enum(['abstract', 'concrete'])
export type SiteRuntimeMode = z.infer<typeof siteRuntimeModeSchema>

export const siteRuntimeSourceKindSchema = z.enum(['player-house', 'world-household', 'poi'])
export type SiteRuntimeSourceKind = z.infer<typeof siteRuntimeSourceKindSchema>

export const siteRuntimeKindSchema = z.enum([
  'house',
  'estate',
  'tavern',
  'guild',
  'market',
  'court',
  'safehouse',
  'sanctuary',
  'industrial',
  'holding-site',
  'mixed-use',
  'unknown',
])
export type SiteRuntimeKind = z.infer<typeof siteRuntimeKindSchema>

export const siteAccessStateSchema = z.enum(['open', 'restricted', 'guarded', 'sealed', 'hidden'])
export type SiteAccessState = z.infer<typeof siteAccessStateSchema>

export const siteRoomConditionSchema = z.enum([
  'intact',
  'damaged',
  'stripped',
  'destroyed',
  'locked',
  'collapsed',
])
export type SiteRoomCondition = z.infer<typeof siteRoomConditionSchema>

export const siteRoomInstanceSchema = z
  .object({
    roomId: entityIdSchema,
    name: z.string().min(1),
    functionId: z.string().nullable().default(null),
    condition: siteRoomConditionSchema,
    capacity: nonNegativeIntegerSchema.default(0),
    accessState: siteAccessStateSchema.default('restricted'),
    tags: z.array(z.string()).default([]),
  })
  .strict()
export type SiteRoomInstance = z.infer<typeof siteRoomInstanceSchema>

export const siteRuntimeSchema = z
  .object({
    siteId: entityIdSchema,
    sourceKind: siteRuntimeSourceKindSchema,
    sourceId: entityIdSchema,
    districtId: entityIdSchema,
    mode: siteRuntimeModeSchema,
    kind: siteRuntimeKindSchema.default('unknown'),
    name: z.string().min(1),
    ownerNpcId: entityIdSchema.nullable().default(null),
    controllingFactionId: entityIdSchema.nullable().default(null),
    securityScore: z.number().int().min(0).max(100).default(0),
    roomInstances: z.array(siteRoomInstanceSchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .strict()
export type SiteRuntime = z.infer<typeof siteRuntimeSchema>

export const npcSitePresenceRoleSchema = z.enum([
  'owner',
  'resident',
  'worker',
  'guard',
  'visitor',
  'guest',
  'patient',
  'sheltered',
  'captive',
])
export type NpcSitePresenceRole = z.infer<typeof npcSitePresenceRoleSchema>

export const npcSitePresenceVisibilitySchema = z.enum(['public', 'discreet', 'hidden'])
export type NpcSitePresenceVisibility = z.infer<typeof npcSitePresenceVisibilitySchema>

export const npcSitePresenceStatusSchema = z.enum(['present', 'away', 'assigned'])
export type NpcSitePresenceStatus = z.infer<typeof npcSitePresenceStatusSchema>

export const npcSitePresenceSchema = z
  .object({
    occupancyId: entityIdSchema,
    npcId: entityIdSchema,
    siteId: entityIdSchema,
    roomId: entityIdSchema.nullable().default(null),
    role: npcSitePresenceRoleSchema,
    visibility: npcSitePresenceVisibilitySchema.default('public'),
    status: npcSitePresenceStatusSchema.default('present'),
    sinceDay: nonNegativeIntegerSchema.default(0),
  })
  .strict()
export type NpcSitePresence = z.infer<typeof npcSitePresenceSchema>
