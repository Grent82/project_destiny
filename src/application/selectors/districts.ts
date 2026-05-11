import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export const selectDistrictSummaries = createSelector(
  (state: RootState) => state.game.districts,
  (districts) =>
    districts.map((district) => ({
      districtId: district.districtId,
      name: contentCatalog.districtsById.get(district.districtId)?.name ?? district.districtId,
      controllingFactionId: district.controllingFactionId,
      controllingFactionName:
        contentCatalog.factionsById.get(district.controllingFactionId)?.name ??
        district.controllingFactionId,
      danger: district.danger,
      marketPressure: district.marketPressure,
      shopTypes: contentCatalog.districtsById.get(district.districtId)?.shopTypes ?? [],
    })),
)

export const selectCurrentDistrictId = (state: RootState) =>
  state.game.currentDistrictId

export const selectCurrentDistrict = (state: RootState) => {
  const id = state.game.currentDistrictId
  if (!id) return null
  return contentCatalog.districtsById.get(id) ?? null
}

export function selectWorldNpcsByDistrict(districtId: string) {
  return contentCatalog.npcs
    .filter((npc) => npc.npcType === 'world' && npc.districtId === districtId)
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      description: npc.description ?? npc.background,
    }))
}

export function selectDistrictPOIs(districtId: string) {
  return (state: RootState) => {
    const pois = contentCatalog.poisByDistrictId.get(districtId) ?? []
    const availableForHire = state.game.availableForHire
    const availableQuestLeads = state.game.availableQuestLeads
    return pois.map((poi) => {
      const npcDef = poi.npcId ? contentCatalog.npcsById.get(poi.npcId) : undefined
      return {
        ...poi,
        hasHireables: poi.actions.includes('hire') && availableForHire.some((o) => o.discoveredInDistrictId === districtId),
        hasContracts:
          poi.actions.includes('contracts') &&
          availableQuestLeads.some(
            (lead) =>
              lead.discoveryDistrictId === districtId &&
              (lead.sourcePoiId == null || lead.sourcePoiId === poi.id) &&
              (lead.expiresOnDay == null || state.game.day <= lead.expiresOnDay),
          ),
        dialogueId: npcDef?.dialogueId ?? null,
      }
    })
  }
}

export const selectDistrictMapEntries = createSelector(
  (state: RootState) => state.game.currentDistrictId,
  (state: RootState) => state.game.districtTension,
  (currentId, tension) =>
    contentCatalog.districts.map((def) => ({
      id: def.id,
      name: def.name,
      controllingFactionId: def.controllingFactionId,
      contestedByFactionIds: def.contestedByFactionIds,
      dangerLevel: def.dangerLevel,
      accessRestricted: def.accessRestricted,
      narrativeSummary: def.narrativeSummary,
      narrativeHook: def.narrativeHook,
      hooks: def.hooks,
      isCurrent: def.id === currentId,
      tension: tension[def.id] ?? null,
      worldNpcs: selectWorldNpcsByDistrict(def.id),
      adjacentDistrictIds: def.adjacentDistrictIds,
      borderTypes: def.borderTypes,
      isAdjacent: currentId !== null && def.adjacentDistrictIds.includes(currentId),
    })),
)
