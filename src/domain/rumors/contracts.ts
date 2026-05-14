import { z } from 'zod'

export const rumorKindSchema = z.enum(['bond', 'planted', 'ambient'])
export const rumorSourceSchema = z.enum(['authored', 'generated', 'player'])
export const rumorTruthSchema = z.enum(['true', 'false', 'mixed'])
export const bondVisibilitySchema = z.enum(['hidden', 'rumored', 'known'])

export const rumorSchema = z
  .object({
    id: z.string().min(1),
    kind: rumorKindSchema,
    source: rumorSourceSchema,
    districtId: z.string().min(1),
    originNpcId: z.string().nullable().default(null),
    templateId: z.string().nullable().default(null),
    text: z.string().min(1),
    subjectNpcIds: z.array(z.string().min(1)).min(1).max(2),
    truth: rumorTruthSchema.default('mixed'),
    credibility: z.number().int().min(0).max(100).default(50),
    heat: z.number().int().min(0).max(100).default(35),
    createdDay: z.number().int().positive(),
    lastSpreadDay: z.number().int().positive(),
  })
  .strict()

export const rumorConsequenceSchema = z
  .object({
    heatThreshold: z.number().int().min(0).max(100),
    unlocksQuestId: z.string().min(1),
  })
  .strict()

export const rumorTemplateSchema = z
  .object({
    id: z.string().min(1),
    kind: rumorKindSchema,
    districtId: z.string().min(1),
    originNpcId: z.string().nullable().default(null),
    text: z.string().min(1),
    subjectNpcIds: z.array(z.string().min(1)).min(1).max(2),
    truth: rumorTruthSchema.default('mixed'),
    credibility: z.number().int().min(0).max(100).default(50),
    tags: z.array(z.string()).default([]),
    consequences: rumorConsequenceSchema.optional(),
  })
  .strict()

export type Rumor = z.infer<typeof rumorSchema>
export type RumorConsequence = z.infer<typeof rumorConsequenceSchema>
export type RumorKind = z.infer<typeof rumorKindSchema>
export type RumorTemplate = z.infer<typeof rumorTemplateSchema>
export type BondVisibility = z.infer<typeof bondVisibilitySchema>
