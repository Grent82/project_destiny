import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export function selectDistrictSummaries(state: RootState) {
  return state.game.districts.map((district) => ({
    districtId: district.districtId,
    name: contentCatalog.districtsById.get(district.districtId)?.name ?? district.districtId,
    controllingFactionId: district.controllingFactionId,
    controllingFactionName:
      contentCatalog.factionsById.get(district.controllingFactionId)?.name ??
      district.controllingFactionId,
    danger: district.danger,
    marketPressure: district.marketPressure,
    shopTypes:
      contentCatalog.districtsById.get(district.districtId)?.shopTypes ?? [],
  }))
}

export const selectCurrentDistrictId = (state: RootState) =>
  state.game.currentDistrictId

export const selectCurrentDistrict = (state: RootState) => {
  const id = state.game.currentDistrictId
  if (!id) return null
  return contentCatalog.districtsById.get(id) ?? null
}

export function selectDistrictMapEntries(state: RootState) {
  const currentId = state.game.currentDistrictId
  return contentCatalog.districts.map((def) => ({
    id: def.id,
    name: def.name,
    controllingFactionId: def.controllingFactionId,
    contestedByFactionIds: def.contestedByFactionIds,
    dangerLevel: def.dangerLevel,
    accessRestricted: def.accessRestricted,
    narrativeSummary: def.narrativeSummary,
    isCurrent: def.id === currentId,
  }))
}
