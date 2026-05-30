import type { GameState, SiteRuntime } from '../../domain'

import { contentCatalog } from '../content/contentCatalog'
import {
  PLAYER_HOUSE_SITE_ID,
  buildPlayerHouseSiteRuntime,
  buildPoiSiteRuntime,
  buildWorldHouseholdSiteRuntime,
} from '../content/siteRuntime'

function unionRoomIds(
  runtime: SiteRuntime,
  state?: Pick<GameState, 'npcSitePresences' | 'npcCaptivityStates'>,
): string[] {
  const ids = new Set(runtime.knownRoomIds)
  for (const room of runtime.roomInstances) ids.add(room.roomId)
  if (state) {
    for (const presence of state.npcSitePresences) {
      if (presence.siteId === runtime.siteId && presence.roomId) ids.add(presence.roomId)
    }
    for (const captivity of Object.values(state.npcCaptivityStates)) {
      if (captivity.siteId === runtime.siteId && captivity.roomId) ids.add(captivity.roomId)
    }
  }
  return Array.from(ids)
}

export function materializeSiteRuntime(state: GameState, siteId: string): SiteRuntime | null {
  if (siteId === PLAYER_HOUSE_SITE_ID) return buildPlayerHouseSiteRuntime(state)

  const householdId = siteId.startsWith('site-world-') ? siteId.slice('site-'.length) : null
  if (householdId) {
    const household = contentCatalog.worldHouseholdsById.get(householdId)
    if (household) return buildWorldHouseholdSiteRuntime(household)
  }

  const poiId = siteId.startsWith('site-poi-') ? siteId.slice('site-'.length) : null
  if (poiId) {
    const poi = contentCatalog.poisById.get(poiId)
    if (poi) return buildPoiSiteRuntime(poi)
  }

  return null
}

export function resolveSiteRuntime(state: GameState, siteId: string): SiteRuntime | null {
  return state.siteRuntimes[siteId] ?? materializeSiteRuntime(state, siteId)
}

export function concretizeSite(state: GameState, siteId: string): GameState {
  const base = resolveSiteRuntime(state, siteId)
  if (!base) return state

  const concrete: SiteRuntime = {
    ...base,
    mode: 'concrete',
    knownRoomIds: unionRoomIds(base, state),
    lastConcretizedDay: state.day,
  }

  return {
    ...state,
    siteRuntimes: {
      ...state.siteRuntimes,
      [siteId]: concrete,
    },
  }
}

export function collapseSite(state: GameState, siteId: string): GameState {
  const current = resolveSiteRuntime(state, siteId)
  if (!current) return state

  const collapsed: SiteRuntime = {
    ...current,
    mode: 'abstract',
    knownRoomIds: unionRoomIds(current, state),
    lastCollapsedDay: state.day,
  }

  return {
    ...state,
    siteRuntimes: {
      ...state.siteRuntimes,
      [siteId]: collapsed,
    },
  }
}
