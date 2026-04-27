import { z } from 'zod'

import {
  entityIdSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
} from '../shared/contracts'

export const shopTypeSchema = z.enum([
  'weapon_dealer',
  'armorer',
  'general_store',
  'apothecary',
  'bookshop',
  'tailor',
  'black_market',
  'workshop',
])

export const shopOfferSchema = z
  .object({
    itemId: entityIdSchema,
    price: positiveIntegerSchema,
    order: nonNegativeIntegerSchema,
  })
  .strict()

export const shopDefinitionSchema = z
  .object({
    id: entityIdSchema,
    districtId: entityIdSchema,
    name: z.string().min(1),
    shopType: shopTypeSchema,
    summary: z.string().min(1),
    offerItemIds: z.array(entityIdSchema).default([]),
    offers: z.array(shopOfferSchema).min(1),
  })
  .strict()

export type ShopDefinition = z.infer<typeof shopDefinitionSchema>
export type ShopOffer = z.infer<typeof shopOfferSchema>
export type ShopType = z.infer<typeof shopTypeSchema>
