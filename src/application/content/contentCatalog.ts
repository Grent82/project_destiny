import districts from '../../../data/definitions/districts.json'
import events from '../../../data/definitions/events.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import missions from '../../../data/definitions/missions.json'
import npcs from '../../../data/definitions/npcs.json'
import shops from '../../../data/definitions/shops.json'
import {
  districtDefinitionSchema,
  eventTemplateSchema,
  factionDefinitionSchema,
  itemDefinitionSchema,
  missionContractSchema,
  npcDefinitionSchema,
  shopDefinitionSchema,
} from '../../domain'

const parsedNpcs = npcDefinitionSchema.array().parse(npcs)
const parsedDistricts = districtDefinitionSchema.array().parse(districts)
const parsedFactions = factionDefinitionSchema.array().parse(factions)
const parsedItems = itemDefinitionSchema.array().parse(items)
const parsedShops = shopDefinitionSchema.array().parse(shops)
const parsedMissions = missionContractSchema.array().parse(missions)
const parsedEvents = eventTemplateSchema.array().parse(events)

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
  missions: parsedMissions,
  missionsById: new Map(parsedMissions.map((m) => [m.id, m])),
  npcs: parsedNpcs,
  npcsById: toMap(parsedNpcs),
  shops: parsedShops,
  shopsById: toMap(parsedShops),
  events: parsedEvents,
  eventsById: toMap(parsedEvents),
}
