import bondBuyersData from '../../../data/definitions/bond-buyers.json'
import worldHouseholdsData from '../../../data/definitions/worldHouseholds.json'
import npcStartingRelationshipsData from '../../../data/definitions/npc-starting-relationships.json'
import encounterTablesData from '../../../data/definitions/encounter-tables.json'
import districts from '../../../data/definitions/districts.json'
import poisData from '../../../data/definitions/pois.json'
import councilVotesData from '../../../data/definitions/council-votes.json'
import factionAgendasData from '../../../data/definitions/faction-agendas.json'
import dialoguesData from '../../../data/definitions/dialogues.json'
import enemyNpcsData from '../../../data/definitions/enemy-npcs.json'
import events from '../../../data/definitions/events.json'
import expeditionDestinationsData from '../../../data/definitions/expedition-destinations.json'
import factions from '../../../data/definitions/factions.json'
import items from '../../../data/definitions/items.json'
import weapons from '../../../data/definitions/weapons.json'
import armor from '../../../data/definitions/armor.json'
import clothingItems from '../../../data/definitions/clothing-items.json'
import armorItems from '../../../data/definitions/armor-items.json'
import npcs from '../../../data/definitions/npcs.json'
import questsData from '../../../data/definitions/quests.json'
import rumorsData from '../../../data/definitions/rumors.json'
import eventRumorTemplatesData from '../../../data/definitions/event-rumor-templates.json'
import shops from '../../../data/definitions/shops.json'
import titlesData from '../../../data/definitions/titles.json'
import datesData from '../../../data/definitions/dates.json'
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
import {
  weaponDefinitionSchema,
  armorDefinitionSchema,
  type WeaponDefinition,
  type ArmorDefinition,
} from '../../domain/items/contracts'
import { titleDefinitionSchema, type TitleDefinition } from '../../domain/titles/contracts'
import { questTemplateSchema, type QuestTemplate } from '../../domain/quests/contracts'
import { councilVoteEventSchema, type CouncilVoteEvent } from '../../domain/governance/contracts'
import { agendaTreeSchema } from '../../domain/factions/contracts'
import { expeditionDestinationSchema } from '../../domain/expedition/contracts'
import { dialogueTreeSchema, type DialogueTree } from '../../domain/dialogue/contracts'
import { rumorTemplateSchema, eventRumorTemplateSchema, type RumorTemplate } from '../../domain/rumors/contracts'
import { dateDefinitionSchema } from '../../domain/dates/contracts'
import { worldHouseholdSchema } from '../../domain/world/contracts'

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
  siteTags: z.array(z.string()).default([]),
  availableSlots: z.array(timeSlotSchema).default(['morning', 'afternoon', 'evening', 'night']),
})
export type PoiDefinition = z.infer<typeof poiSchema>

const parsedTitles = titleDefinitionSchema.array().parse(titlesData)
const parsedQuests = questTemplateSchema.array().parse(questsData)
const parsedCouncilVotes = councilVoteEventSchema.array().parse(councilVotesData)
const parsedAgendaTrees = agendaTreeSchema.array().parse(factionAgendasData)
const parsedDialogues = dialogueTreeSchema.array().parse(dialoguesData)
const parsedNpcs = npcDefinitionSchema.array().parse(npcs)
const parsedDistricts = districtDefinitionSchema.array().parse(districts)
const parsedFactions = factionDefinitionSchema.array().parse(factions)
const parsedPois = poiSchema.array().parse(poisData)
const parsedItems = itemDefinitionSchema.array().parse(items)
const parsedWeapons = weaponDefinitionSchema.array().parse(weapons)
const parsedArmor = armorDefinitionSchema.array().parse(armor)
const parsedShops = shopDefinitionSchema.array().parse(shops)
const parsedEvents = eventTemplateSchema.array().parse(events)
const parsedDestinations = expeditionDestinationSchema.array().parse(expeditionDestinationsData)
const parsedRumorTemplates = rumorTemplateSchema.array().parse(rumorsData)
const parsedEventRumorTemplates = eventRumorTemplateSchema.array().parse(eventRumorTemplatesData)
const parsedEnemyNpcs = enemyNpcDefinitionSchema.array().parse(enemyNpcsData)
const parsedNpcStartingRelationships = npcStartingRelationshipSchema.array().parse(npcStartingRelationshipsData)
const parsedWorldHouseholds = worldHouseholdSchema.array().parse(worldHouseholdsData)

const bondBuyerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  factionId: z.string().nullable(),
  specialization: z.enum(['assessed', 'specialist', 'security', 'labor']),
  offerModifier: z.number().positive(),
})
export type BondBuyerDefinition = z.infer<typeof bondBuyerSchema>
const parsedBondBuyers = bondBuyerSchema.array().parse(bondBuyersData)
const datesCatalogSchema = z.object({ dates: z.array(dateDefinitionSchema) })
const parsedDates = datesCatalogSchema.parse(datesData).dates

function toMap<T extends { id: string }>(entries: T[]) {
  return new Map(entries.map((entry) => [entry.id, entry]))
}

/**
 * Builds a unified itemsById map from all item sources:
 * - General items (items.json)
 * - Weapons (weapons.json)
 * - Armor (armor.json)
 *
 * This ensures that lookups for any item type return consistent results,
 * fixing issues like 'unknown' categories in shops and missing item names
 * in purchase/sell flows.
 */
const parsedClothingItems = z.array(itemDefinitionSchema).parse(clothingItems)
const parsedArmorItems = z.array(armorDefinitionSchema).parse(armorItems)

function buildItemsById(): Map<string, WeaponDefinition | ArmorDefinition | typeof parsedItems[number]> {
  const map = new Map<string, WeaponDefinition | ArmorDefinition | typeof parsedItems[number]>()

  for (const item of parsedItems) {
    map.set(item.id, item)
  }
  for (const weapon of parsedWeapons) {
    map.set(weapon.id, weapon)
  }
  for (const armorPiece of parsedArmor) {
    map.set(armorPiece.id, armorPiece)
  }
  for (const clothing of parsedClothingItems) {
    map.set(clothing.id, clothing)
  }
  for (const armorItem of parsedArmorItems) {
    map.set(armorItem.id, armorItem)
  }

  return map
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
  weapons: parsedWeapons,
  armor: parsedArmor,
  clothingItems: parsedClothingItems,
  armorItems: parsedArmorItems,
  itemsById: buildItemsById(),
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
  agendaTrees: parsedAgendaTrees,
  agendaTreesById: toMap(parsedAgendaTrees),
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
    parsedNpcStartingRelationships.map((r) => [`${r.fromNpcId}-to-${r.toNpcId}`, r])
  ),
  bondBuyers: parsedBondBuyers,
  bondBuyersById: toMap(parsedBondBuyers),
  dates: parsedDates,
  datesById: toMap(parsedDates),
  worldHouseholds: parsedWorldHouseholds,
  worldHouseholdsById: toMap(parsedWorldHouseholds),
  worldHouseholdsByDistrictId: new Map(
    Array.from(new Set(parsedWorldHouseholds.map((h) => h.districtId))).map((districtId) => [
      districtId,
      parsedWorldHouseholds.filter((h) => h.districtId === districtId),
    ]),
  ),
}

// Required-field matrix for outcome types
const outcomeRequiredFields: Record<string, { required: string[]; enumTarget?: string[]; forbidKeys?: string[] }> = {
  adjustFactionStanding: { required: ['target', 'delta'] },
  adjustCityDial: { required: ['target', 'delta'], enumTarget: ['control', 'prosperity', 'unrest', 'corruption'] },
  adjustCityResource: { required: ['target', 'delta'], enumTarget: ['foodSecurity', 'waterAccess', 'materialStock'] },
  adjustNpcState: { required: ['subject', 'axis', 'delta'] },
  addCredits: { required: ['delta'] },
  addActivityLogEntry: { required: ['message'] },
  setCorridorStatus: { required: ['target'], enumTarget: ['open', 'disrupted', 'blocked'] },
  adjustNpcRelationship: { required: ['npcId', 'axis', 'delta'], forbidKeys: ['target'] },
  createQuestLead: { required: ['questId'] },
  updateQuestStage: { required: ['questId', 'stageId'] },
  unlockNpc: { required: ['npcId'] },
  addNpcToRoster: { required: ['npcId'] },
  transferBondedNpc: { required: [] },
}

const npcAxes = ['affinity', 'respect', 'fear', 'trust', 'loyalty'] as const
const npcStateAxes = ['health', 'fatigue', 'stress', 'morale', 'fear', 'anger', 'hunger', 'injury', 'intoxication', 'hygiene', 'loyalty'] as const

function validateCatalogIntegrity(): void {
  const errors: string[] = []
  const { questsById, npcsById, itemsById, factionsById, districtsById } = contentCatalog

  // Check event outcome cross-references and required fields
  for (const event of contentCatalog.events) {
    // Validate sourceDistrictId if present
    if (event.sourceDistrictId != null && !districtsById.has(event.sourceDistrictId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid sourceDistrictId "${event.sourceDistrictId}" which does not exist in districts catalog`,
      )
    }

    // Validate sourceNpcId if present
    if (event.sourceNpcId != null && !npcsById.has(event.sourceNpcId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid sourceNpcId "${event.sourceNpcId}" which does not exist in npcs catalog`,
      )
    }

    // Validate trigger conditions
    const tc = event.triggerConditions
    if (tc.currentDistrict != null && !districtsById.has(tc.currentDistrict)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.currentDistrict "${tc.currentDistrict}" which does not exist in districts catalog`,
      )
    }
    if (tc.requiredRosterNpcId != null && !npcsById.has(tc.requiredRosterNpcId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.requiredRosterNpcId "${tc.requiredRosterNpcId}" which does not exist in npcs catalog`,
      )
    }
    if (tc.activeQuestId != null && !questsById.has(tc.activeQuestId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.activeQuestId "${tc.activeQuestId}" which does not exist in quests catalog`,
      )
    }
    if (tc.factionStandingBelow?.factionId && !factionsById.has(tc.factionStandingBelow.factionId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.factionStandingBelow.factionId "${tc.factionStandingBelow.factionId}" which does not exist in factions catalog`,
      )
    }
    if (tc.factionStandingAbove?.factionId && !factionsById.has(tc.factionStandingAbove.factionId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.factionStandingAbove.factionId "${tc.factionStandingAbove.factionId}" which does not exist in factions catalog`,
      )
    }
    if (tc.npcRelationshipMin?.npcId && !npcsById.has(tc.npcRelationshipMin.npcId)) {
      errors.push(
        `events.json: event "${event.id}" has invalid triggerConditions.npcRelationshipMin.npcId "${tc.npcRelationshipMin.npcId}" which does not exist in npcs catalog`,
      )
    }

    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        const outcomeType = outcome.type
        const rules = outcomeRequiredFields[outcomeType]

        // Check required fields
        if (rules) {
          for (const field of rules.required) {
            if (outcome[field as keyof typeof outcome] == null) {
              errors.push(
                `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" missing required field "${field}"`,
              )
            }
          }

          // Check enum targets
          if (rules.enumTarget && outcome.target && !rules.enumTarget!.includes(outcome.target)) {
            errors.push(
              `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" has invalid target "${outcome.target}"; expected one of: ${rules.enumTarget!.join(', ')}`,
            )
          }

          // Check forbidden keys (the "target" vs "npcId" bug class)
          if (rules.forbidKeys?.includes('target') && outcome.target != null) {
            errors.push(
              `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" uses forbidden field "target" instead of "npcId"`,
            )
          }
        }

        // Validate ID references
        if (outcome.npcId != null && !npcsById.has(outcome.npcId)) {
          errors.push(
            `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" references npcId "${outcome.npcId}" which does not exist in npcs catalog`,
          )
        }
        if (outcome.questId != null && !questsById.has(outcome.questId)) {
          errors.push(
            `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" references questId "${outcome.questId}" which does not exist in quests catalog`,
          )
        }
        if (outcome.target != null) {
          // Validate target against appropriate catalog based on outcome type
          if (outcomeType === 'adjustFactionStanding' && !factionsById.has(outcome.target)) {
            errors.push(
              `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" references target faction "${outcome.target}" which does not exist in factions catalog`,
            )
          }
        }
        // Validate axis for adjustNpcRelationship
        if (outcomeType === 'adjustNpcRelationship' && outcome.axis && !npcAxes.includes(outcome.axis as typeof npcAxes[number])) {
          errors.push(
            `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" has invalid axis "${outcome.axis}"`,
          )
        }

        if (outcomeType === 'adjustNpcState') {
          if (outcome.axis && !npcStateAxes.includes(outcome.axis as typeof npcStateAxes[number])) {
            errors.push(
              `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" has invalid axis "${outcome.axis}"`,
            )
          }
          if (outcome.subject) {
            const directNpcMatch = outcome.subject.match(/^npcId:(.+)$/)
            if (directNpcMatch && !npcsById.has(directNpcMatch[1]!)) {
              errors.push(
                `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" references subject npcId "${directNpcMatch[1]}" which does not exist in npcs catalog`,
              )
            }
            const subjectKeywords = ['highest-stress', 'lowest-morale', 'highest-loyalty']
            if (!directNpcMatch && !subjectKeywords.includes(outcome.subject)) {
              errors.push(
                `events.json: event "${event.id}" choice "${choice.id}" outcome type "${outcomeType}" has invalid subject "${outcome.subject}"`,
              )
            }
          }
        }
      }
    }
  }

  // Check quest cross-references
  for (const quest of contentCatalog.quests) {
    if (quest.successorQuestId != null && !questsById.has(quest.successorQuestId)) {
      errors.push(
        `quests.json: quest "${quest.id}" successorQuestId "${quest.successorQuestId}" does not exist in quests catalog`,
      )
    }
    if (quest.successorOnFailQuestId != null && !questsById.has(quest.successorOnFailQuestId)) {
      errors.push(
        `quests.json: quest "${quest.id}" successorOnFailQuestId "${quest.successorOnFailQuestId}" does not exist in quests catalog`,
      )
    }
    if (quest.enemyNpcId != null && !npcsById.has(quest.enemyNpcId)) {
      errors.push(
        `quests.json: quest "${quest.id}" enemyNpcId "${quest.enemyNpcId}" does not exist in npcs catalog`,
      )
    }
    for (const itemId of quest.rewardItemIds) {
      if (!itemsById.has(itemId)) {
        errors.push(
          `quests.json: quest "${quest.id}" rewardItemIds references item "${itemId}" which does not exist in items catalog`,
        )
      }
    }
  }

  // Check shop offer item references
  for (const shop of contentCatalog.shops) {
    for (const offer of shop.offers) {
      if (!itemsById.has(offer.itemId)) {
        errors.push(
          `shops.json: shop "${shop.id}" offers item "${offer.itemId}" which does not exist in items catalog (items.json, weapons.json, or armor.json)`,
        )
      }
    }
  }

  if (errors.length === 0) return

  const message = `contentCatalog: ${errors.length} catalog integrity error(s) found:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
  if (!import.meta.env.PROD) {
    throw new Error(message)
  } else {
    console.error(message)
  }
}

validateCatalogIntegrity()

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
