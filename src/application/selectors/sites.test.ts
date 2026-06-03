import { describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { PLAYER_HOUSE_SITE_ID } from '../content/siteRuntime'
import {
  selectNpcSitePresences,
  selectPlayerHouseRoomOccupancy,
  selectPlayerHouseSiteRuntime,
  selectSiteRuntimeById,
  selectPoiSiteRuntimeById,
  selectWorldHouseholdSiteRuntimeById,
} from './sites'

describe('site selectors', () => {
  it('surfaces the player house as a site runtime', () => {
    const store = createGameStore()
    const runtime = selectPlayerHouseSiteRuntime(store.getState())

    expect(runtime).not.toBeNull()
    if (!runtime) throw new Error('expected player house runtime')
    expect(runtime.siteId).toBe(PLAYER_HOUSE_SITE_ID)
    expect(runtime.mode).toBe('concrete')
    expect(runtime.roomInstances.some((room) => room.roomId === 'room-bureau')).toBe(true)
  })

  it('stores and filters NPC site occupancy for the player house', () => {
    const store = createGameStore()
    store.dispatch(
      gameActions.upsertNpcSitePresence({
        occupancyId: 'occ-marion-quarters',
        npcId: 'npc-marion-vale',
        siteId: PLAYER_HOUSE_SITE_ID,
        roomId: 'room-quarters',
        role: 'resident',
        visibility: 'public',
        status: 'present',
        sinceDay: 1,
      }),
    )

    const allPresences = selectNpcSitePresences(store.getState())
    const housePresences = selectPlayerHouseRoomOccupancy(store.getState())
    expect(allPresences).toHaveLength(1)
    expect(housePresences).toHaveLength(1)
    expect(housePresences[0]?.roomId).toBe('room-quarters')
  })

  it('can represent a world household and a POI through the same site runtime shape', () => {
    const store = createGameStore()
    const household = selectWorldHouseholdSiteRuntimeById('world-house-sorn')(store.getState())
    const poi = selectPoiSiteRuntimeById('poi-harbor-the-berth')(store.getState())

    expect(household?.sourceKind).toBe('world-household')
    expect(household?.mode).toBe('abstract')
    expect(household?.roomInstances.length).toBeGreaterThan(0)

    expect(poi?.sourceKind).toBe('poi')
    expect(poi?.mode).toBe('abstract')
    expect(Array.isArray(poi?.roomInstances)).toBe(true)
  })

  it('resolves explicitly concretized sites from runtime state', () => {
    const store = createGameStore()
    store.dispatch(gameActions.concretizeSite({ siteId: 'site-world-house-sorn' }))

    const runtime = selectSiteRuntimeById('site-world-house-sorn')(store.getState())
    expect(runtime?.mode).toBe('concrete')
    expect(runtime?.knownRoomIds.length).toBeGreaterThan(0)
  })
})
