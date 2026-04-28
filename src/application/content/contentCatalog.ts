import districts from '../../../data/definitions/districts.json'
import councilVotesData from '../../../data/definitions/council-votes.json'
import enemyNpcsData from '../../../data/definitions/enemy-npcs.json'
import events from '../../../data/definitions/events.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import missions from '../../../data/definitions/missions.json'
import npcs from '../../../data/definitions/npcs.json'
import questsData from '../../../data/definitions/quests.json'
import shops from '../../../data/definitions/shops.json'
import titlesData from '../../../data/definitions/titles.json'
import {
  districtDefinitionSchema,
  eventTemplateSchema,
  factionDefinitionSchema,
  itemDefinitionSchema,
  missionContractSchema,
  npcDefinitionSchema,
  shopDefinitionSchema,
} from '../../domain'
import { titleDefinitionSchema, type TitleDefinition } from '../../domain/titles/contracts'
import { questTemplateSchema, type QuestTemplate } from '../../domain/quests/contracts'
import { councilVoteEventSchema, type CouncilVoteEvent } from '../../domain/governance/contracts'

const parsedTitles = titleDefinitionSchema.array().parse(titlesData)
const parsedQuests = questTemplateSchema.array().parse(questsData)
const parsedCouncilVotes = councilVoteEventSchema.array().parse(councilVotesData)
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
  titles: parsedTitles,
  titlesById: toMap(parsedTitles),
  quests: parsedQuests,
  questsById: toMap(parsedQuests),
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
  enemyNpcs: enemyNpcsData as Array<{ id: string; name: string; [key: string]: unknown }>,
  enemyNpcsById: new Map((enemyNpcsData as Array<{ id: string; name: string }>).map((e) => [e.id, e])),
  shops: parsedShops,
  shopsById: toMap(parsedShops),
  events: parsedEvents,
  eventsById: toMap(parsedEvents),
  councilVotes: parsedCouncilVotes,
}

export function getTitleDefinitions(): TitleDefinition[] {
  return contentCatalog.titles
}

export function getQuestTemplates(): QuestTemplate[] {
  return contentCatalog.quests
}

export function getNpcDefinitions() {
  return contentCatalog.npcs
}

export function getCouncilVoteTemplates(): CouncilVoteEvent[] {
  return contentCatalog.councilVotes
}
