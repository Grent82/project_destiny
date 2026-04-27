import { z } from 'zod'

export const entityIdSchema = z.string().min(1)

export const percentageSchema = z.number().finite().min(0).max(100)

export const signedStandingSchema = z.number().int().min(-100).max(100)

export const nonNegativeIntegerSchema = z.number().int().min(0)

export const positiveIntegerSchema = z.number().int().positive()

export const nonNegativeNumberSchema = z.number().finite().min(0)

export const raritySchema = z.enum(['common', 'uncommon', 'rare', 'elite', 'legendary'])

export const combatRangeSchema = z.enum(['close', 'distant'])

export const timeSlotSchema = z.enum(['morning', 'afternoon', 'evening', 'night'])

export type CombatRange = z.infer<typeof combatRangeSchema>
export type EntityId = z.infer<typeof entityIdSchema>
export type Percentage = z.infer<typeof percentageSchema>
export type Rarity = z.infer<typeof raritySchema>
export type TimeSlot = z.infer<typeof timeSlotSchema>
