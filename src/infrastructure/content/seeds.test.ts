import districts from '../../../data/definitions/districts.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import npcs from '../../../data/definitions/npcs.json'
import shops from '../../../data/definitions/shops.json'
import initialGameState from '../../../data/runtime/initial-game-state.json'
import {
  districtDefinitionSchema,
  factionDefinitionSchema,
  gameStateSchema,
  itemDefinitionSchema,
  npcDefinitionSchema,
  shopDefinitionSchema,
} from '../../domain'

describe('seed content', () => {
  it('validates district definitions', () => {
    const result = districtDefinitionSchema.array().safeParse(districts)

    expect(result.success).toBe(true)
  })

  it('validates faction definitions', () => {
    const result = factionDefinitionSchema.array().safeParse(factions)

    expect(result.success).toBe(true)
  })

  it('validates item definitions', () => {
    const result = itemDefinitionSchema.array().safeParse(items)

    expect(result.success).toBe(true)
  })

  it('validates npc definitions', () => {
    const result = npcDefinitionSchema.array().safeParse(npcs)

    expect(result.success).toBe(true)
  })

  it('validates shop definitions', () => {
    const result = shopDefinitionSchema.array().safeParse(shops)

    expect(result.success).toBe(true)
  })

  it('validates the initial runtime state separately from the content definitions', () => {
    const result = gameStateSchema.safeParse(initialGameState)

    expect(result.success).toBe(true)
  })
})
