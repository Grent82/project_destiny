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

export const councilVoteEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  proposingFactionId: z.string(),
  targetFactionId: z.string().nullable(),
  effect: z.string(),
  playerInfluenceThreshold: z.number(),
  expiresOnDay: z.number(),
  outcome: z.enum(['pending', 'passed', 'failed']).default('pending'),
  playerVote: z.enum(['support', 'oppose']).nullable().default(null),
})

export type CouncilVoteEvent = z.infer<typeof councilVoteEventSchema>
