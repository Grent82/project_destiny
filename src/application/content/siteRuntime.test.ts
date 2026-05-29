import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from './contentCatalog'
import {
  PLAYER_HOUSE_SITE_ID,
  buildPlayerHouseSiteRuntime,
  buildPoiSiteRuntime,
  buildWorldHouseholdSiteRuntime,
} from './siteRuntime'

describe('siteRuntime adapters', () => {
  it('builds a concrete player-house site runtime from the house state', () => {
    const runtime = buildPlayerHouseSiteRuntime(initialGameStateSnapshot)

    expect(runtime.siteId).toBe(PLAYER_HOUSE_SITE_ID)
    expect(runtime.mode).toBe('concrete')
    expect(runtime.kind).toBe('house')
    expect(runtime.roomInstances).toHaveLength(initialGameStateSnapshot.house.rooms.length)
    expect(runtime.roomInstances.find((room) => room.roomId === 'room-marion-quarters')?.capacity).toBe(1)
    expect(runtime.roomInstances.find((room) => room.roomId === 'room-vault')?.accessState).toBe('sealed')
  })

  it('builds an abstract world-household runtime from authored household rooms', () => {
    const household = contentCatalog.worldHouseholds.find((entry) => (entry.rooms?.length ?? 0) > 0)
    expect(household).toBeDefined()

    const runtime = buildWorldHouseholdSiteRuntime(household!)
    expect(runtime.mode).toBe('abstract')
    expect(runtime.sourceKind).toBe('world-household')
    expect(runtime.roomInstances).toHaveLength(household!.rooms!.length)
    expect(runtime.securityScore).toBe(household!.security)
  })

  it('builds an abstract POI runtime with no pre-expanded rooms', () => {
    const poi = contentCatalog.poisById.get('poi-harbor-the-berth')
    expect(poi).toBeDefined()

    const runtime = buildPoiSiteRuntime(poi!)
    expect(runtime.mode).toBe('abstract')
    expect(runtime.sourceKind).toBe('poi')
    expect(runtime.roomInstances).toEqual([])
    expect(runtime.kind).toBe('tavern')
  })
})
