import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import {
  PLAYER_HOUSE_SITE_ID,
  buildPlayerHouseSiteRuntime,
  buildPoiSiteRuntime,
  buildWorldHouseholdSiteRuntime,
  selectSitePresences,
} from '../content/siteRuntime'

const selectGame = (state: RootState) => state.game

export const selectNpcSitePresences = createSelector([selectGame], (game) => game.npcSitePresences)

export const selectPlayerHouseSiteRuntime = createSelector([selectGame], (game) =>
  buildPlayerHouseSiteRuntime(game),
)

export const selectPlayerHouseRoomOccupancy = createSelector(
  [selectNpcSitePresences],
  (presences) => selectSitePresences(presences, PLAYER_HOUSE_SITE_ID),
)

export const selectWorldHouseholdSiteRuntimeById = (householdId: string) => (_state: RootState) => {
  const household = contentCatalog.worldHouseholdsById.get(householdId)
  return household ? buildWorldHouseholdSiteRuntime(household) : null
}

export const selectPoiSiteRuntimeById = (poiId: string) => (_state: RootState) => {
  const poi = contentCatalog.poisById.get(poiId)
  return poi ? buildPoiSiteRuntime(poi) : null
}
