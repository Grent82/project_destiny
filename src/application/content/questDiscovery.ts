import type { QuestDiscoverySource, QuestTemplate } from '../../domain/quests/contracts'

type PoiStub = {
  id: string
  districtId: string
  type: string
  factionId?: string | null
}

const QUEST_DISCOVERY_SOURCES_BY_POI_TYPE: Record<string, QuestDiscoverySource[]> = {
  guild: ['guild'],
  tavern: ['bar'],
  court: ['court'],
  faction_hq: ['faction_house'],
  black_market: ['bar'],
}

export function getQuestDiscoverySourcesForPoiType(poiType: string): QuestDiscoverySource[] {
  return QUEST_DISCOVERY_SOURCES_BY_POI_TYPE[poiType] ?? []
}

export function matchesQuestDiscoveryAtPoi(template: QuestTemplate, poi: PoiStub) {
  if (!template.discoverySource || !template.discoveryDistrictId) return false
  if (template.discoverySource === 'npc') return false
  if (template.discoveryDistrictId !== poi.districtId) return false

  const allowedSources = getQuestDiscoverySourcesForPoiType(poi.type)
  if (!allowedSources.includes(template.discoverySource)) return false

  if (template.discoverySource === 'faction_house' && template.employerFactionId && poi.factionId) {
    return template.employerFactionId === poi.factionId
  }

  return true
}
