import districts from '../../../data/definitions/districts.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import npcs from '../../../data/definitions/npcs.json'
import shops from '../../../data/definitions/shops.json'
import {
  districtDefinitionSchema,
  factionDefinitionSchema,
  itemDefinitionSchema,
  npcDefinitionSchema,
  shopDefinitionSchema,
} from '../../domain'

const parsedNpcs = npcDefinitionSchema.array().parse(npcs)
const parsedDistricts = districtDefinitionSchema.array().parse(districts)
const parsedFactions = factionDefinitionSchema.array().parse(factions)
const parsedItems = itemDefinitionSchema.array().parse(items)
const parsedShops = shopDefinitionSchema.array().parse(shops)

function toMap<T extends { id: string }>(entries: T[]) {
  return new Map(entries.map((entry) => [entry.id, entry]))
}

export const contentCatalog = {
  districts: parsedDistricts,
  districtsById: toMap(parsedDistricts),
  factions: parsedFactions,
  factionsById: toMap(parsedFactions),
  items: parsedItems,
  itemsById: toMap(parsedItems),
  npcs: parsedNpcs,
  npcsById: toMap(parsedNpcs),
  shops: parsedShops,
  shopsById: toMap(parsedShops),
}
