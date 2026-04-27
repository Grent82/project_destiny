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
