import npcStartingRelationshipsData from '../../../data/definitions/npc-starting-relationships.json'
import encounterTablesData from '../../../data/definitions/encounter-tables.json'
import districts from '../../../data/definitions/districts.json'
import poisData from '../../../data/definitions/pois.json'
import councilVotesData from '../../../data/definitions/council-votes.json'
import dialoguesData from '../../../data/definitions/dialogues.json'
import enemyNpcsData from '../../../data/definitions/enemy-npcs.json'
import events from '../../../data/definitions/events.json'
import expeditionDestinationsData from '../../../data/definitions/expedition-destinations.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import npcs from '../../../data/definitions/npcs.json'
import questsData from '../../../data/definitions/quests.json'
import rumorsData from '../../../data/definitions/rumors.json'
import eventRumorTemplatesData from '../../../data/definitions/event-rumor-templates.json'
import shops from '../../../data/definitions/shops.json'
import titlesData from '../../../data/definitions/titles.json'
import { z } from 'zod'
import {
  districtDefinitionSchema,
  eventTemplateSchema,
  factionDefinitionSchema,
  itemDefinitionSchema,
  npcDefinitionSchema,
  enemyNpcDefinitionSchema,
  shopDefinitionSchema,
  timeSlotSchema,
  type NpcDefinition,
} from '../../domain'
import { titleDefinitionSchema, type TitleDefinition } from '../../domain/titles/contracts'
import { questTemplateSchema, type QuestTemplate } from '../../domain/quests/contracts'
import { councilVoteEventSchema, type CouncilVoteEvent } from '../../domain/governance/contracts'
import { expeditionDestinationSchema } from '../../domain/expedition/contracts'
import { dialogueTreeSchema, type DialogueTree } from '../../domain/dialogue/contracts'
import { rumorTemplateSchema, eventRumorTemplateSchema, type RumorTemplate } from '../../domain/rumors/contracts'

const npcStartingRelationshipSchema = z.object({
  fromNpcId: z.string(),
  toNpcId: z.string(),
  axes: z.object({
    affinity: z.number(),
    trust: z.number(),
    respect: z.number(),
    fear: z.number(),
    loyalty: z.number(),
  }),
})
export type NpcStartingRelationship = z.infer<typeof npcStartingRelationshipSchema>

const encounterEntrySchema = z.object({ name: z.string(), lore: z.string() })
const encounterTableSchema = z.object({
  districtId: z.string(),
  enemies: encounterEntrySchema.array().min(1),
})
export type EncounterEntry = z.infer<typeof encounterEntrySchema>
const parsedEncounterTables = encounterTableSchema.array().parse(encounterTablesData)

const poiSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  name: z.string(),
  type: z.enum(['guild', 'tavern', 'shop', 'court', 'residence', 'market', 'faction_hq', 'black_market']),
  description: z.string(),
  factionId: z.string().nullable(),
  actions: z.array(z.enum(['contracts', 'hire', 'shop'])),
  npcId: z.string().optional(),
  availableSlots: z.array(timeSlotSchema).default(['morning', 'afternoon', 'evening', 'night']),
})
export type PoiDefinition = z.infer<typeof poiSchema>

const parsedTitles = titleDefinitionSchema.array().parse(titlesData)
const parsedQuests = questTemplateSchema.array().parse(questsData)
const parsedCouncilVotes = councilVoteEventSchema.array().parse(councilVotesData)
const parsedDialogues = dialogueTreeSchema.array().parse(dialoguesData)
const parsedNpcs = npcDefinitionSchema.array().parse(npcs)
const parsedDistricts = districtDefinitionSchema.array().parse(districts)
const parsedFactions = factionDefinitionSchema.array().parse(factions)
const parsedPois = poiSchema.array().parse(poisData)
const parsedItems = itemDefinitionSchema.array().parse(items)
const parsedShops = shopDefinitionSchema.array().parse(shops)
const parsedEvents = eventTemplateSchema.array().parse(events)
const parsedDestinations = expeditionDestinationSchema.array().parse(expeditionDestinationsData)
const parsedRumorTemplates = rumorTemplateSchema.array().parse(rumorsData)
const parsedEventRumorTemplates = eventRumorTemplateSchema.array().parse(eventRumorTemplatesData)
const parsedEnemyNpcs = enemyNpcDefinitionSchema.array().parse(enemyNpcsData)
const parsedNpcStartingRelationships = npcStartingRelationshipSchema.array().parse(npcStartingRelationshipsData)

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
  npcs: parsedNpcs,
  npcsById: toMap(parsedNpcs),
  enemyNpcs: parsedEnemyNpcs,
  enemyNpcsById: toMap(parsedEnemyNpcs),
  encounterTablesByDistrict: new Map(parsedEncounterTables.map((t) => [t.districtId, t.enemies])),
  shops: parsedShops,
  shopsById: toMap(parsedShops),
  events: parsedEvents,
  eventsById: toMap(parsedEvents),
  councilVotes: parsedCouncilVotes,
  expeditionDestinations: parsedDestinations,
  expeditionDestinationsById: new Map(parsedDestinations.map((d) => [d.id, d])),
  dialogues: parsedDialogues,
  dialoguesById: new Map(parsedDialogues.map((d) => [d.id, d])),
  dialoguesByNpcId: new Map(parsedDialogues.map((d) => [d.npcId, d])),
  pois: parsedPois,
  poisById: toMap(parsedPois),
  poisByDistrictId: new Map(
    Array.from(new Set(parsedPois.map((p) => p.districtId))).map((districtId) => [
      districtId,
      parsedPois.filter((p) => p.districtId === districtId),
    ])
  ),
  rumors: parsedRumorTemplates,
  rumorsById: toMap(parsedRumorTemplates),
  eventRumorTemplates: parsedEventRumorTemplates,
  districtNameToId: new Map(parsedDistricts.map((d) => [d.name, d.id])),
  npcStartingRelationships: parsedNpcStartingRelationships,
  npcStartingRelationshipsByNpcId: new Map(
    Array.from(new Set(parsedNpcStartingRelationships.map((r) => r.fromNpcId))).map((npcId) => [
      npcId,
      parsedNpcStartingRelationships.filter((r) => r.fromNpcId === npcId),
    ])
  ),
  npcStartingRelationshipsByKey: new Map(
    parsedNpcStartingRelationships.map((r) => [`${r.fromNpcId}→${r.toNpcId}`, r])
  ),
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

export function getDialogueTrees(): DialogueTree[] {
  return contentCatalog.dialogues
}

export function safeGetNpc(npcId: string): NpcDefinition | null {
  return contentCatalog.npcsById.get(npcId) ?? null
}

export function getRumorTemplates(): RumorTemplate[] {
  return contentCatalog.rumors
}
