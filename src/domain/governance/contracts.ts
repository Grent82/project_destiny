import { z } from 'zod'

export const institutionalTierSchema = z.enum([
  'allied',      // active institutional ally — can attend council, get licenses
  'neutral',     // no institutional relationship — default for most
  'watched',     // noted but not hostile — some doors closed
  'hostile',     // blocked from institutional services — fines, harassment
  'blacklisted', // severe — active enforcement against player (arrests, asset seizure)
])

export type InstitutionalTier = z.infer<typeof institutionalTierSchema>

export const councilSeatCountSchema = z.record(z.string(), z.number().min(0).max(5))

/**
 * Structured mechanical effect applied when a council vote passes.
 * All effects are applied immediately (timed/expiring effects are a future extension).
 */
export const voteEffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('factionStanding'),
    factionId: z.string(),
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal('cityDial'),
    dial: z.enum(['control', 'prosperity', 'unrest', 'corruption']),
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal('districtTension'),
    districtId: z.string(),
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal('districtMarketPressure'),
    districtId: z.string(),
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal('districtDanger'),
    districtId: z.string(),
    delta: z.number().int(),
  }),
])

export type VoteEffect = z.infer<typeof voteEffectSchema>

export const councilVoteEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  proposingFactionId: z.string(),
  targetFactionId: z.string().nullable(),
  effect: z.string(),
  mechanicalEffects: z.array(voteEffectSchema).default([]),
  playerInfluenceThreshold: z.number(),
  expiresOnDay: z.number(),
  outcome: z.enum(['pending', 'passed', 'failed']).default('pending'),
  playerVote: z.enum(['support', 'oppose']).nullable().default(null),
})

export type CouncilVoteEvent = z.infer<typeof councilVoteEventSchema>
