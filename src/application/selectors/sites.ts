import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import {
  PLAYER_HOUSE_SITE_ID,
  selectSitePresences,
} from '../content/siteRuntime'
import { resolveSiteRuntime } from '../commands/siteLifecycle'

const selectGame = (state: RootState) => state.game

export const selectNpcSitePresences = createSelector([selectGame], (game) => game.npcSitePresences)

export const selectPlayerHouseSiteRuntime = createSelector([selectGame], (game) =>
  resolveSiteRuntime(game, PLAYER_HOUSE_SITE_ID),
)

export const selectPlayerHouseRoomOccupancy = createSelector(
  [selectNpcSitePresences],
  (presences) => selectSitePresences(presences, PLAYER_HOUSE_SITE_ID),
)

export const selectWorldHouseholdSiteRuntimeById = (householdId: string) => (_state: RootState) => {
  return resolveSiteRuntime(_state.game, `site-${householdId}`)
}

export const selectPoiSiteRuntimeById = (poiId: string) => (_state: RootState) => {
  return resolveSiteRuntime(_state.game, `site-${poiId}`)
}

export const selectSiteRuntimeById = (siteId: string) => (state: RootState) =>
  resolveSiteRuntime(state.game, siteId)
