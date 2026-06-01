import { describe, expect, it } from 'vitest'

import { contentCatalog } from '../content/contentCatalog'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyWorldHouseholdGrowth } from './applyWorldHouseholdGrowth'
import { collapseSite, concretizeSite, resolveSiteRuntime } from './siteLifecycle'

describe('applyWorldHouseholdGrowth', () => {
  it('lets funded world households add new rooms, stronger security, and growth commitments over time', () => {
    const household = contentCatalog.worldHouseholdsById.get('world-salt-ledger-hall')
    expect(household).toBeDefined()

    const grown = applyWorldHouseholdGrowth(initialGameStateSnapshot, () => 0)
    const runtime = resolveSiteRuntime(grown, 'site-world-salt-ledger-hall')

    expect(runtime).not.toBeNull()
    expect(runtime?.tags).toContain('growth-stage:1')
    expect(runtime?.tags.some((tag) => tag.startsWith('growth-commitment:'))).toBe(true)
    expect(runtime?.securityScore).toBeGreaterThan(household!.security)
    expect(runtime?.roomInstances.some((room) => room.tags.includes('household-growth'))).toBe(true)
    expect(grown.cityResources.materialStock).toBeGreaterThan(initialGameStateSnapshot.cityResources.materialStock)
    expect(grown.cityDials.prosperity).toBeGreaterThan(initialGameStateSnapshot.cityDials.prosperity)
  })

  it('can repurpose and later deepen site capacity across multiple growth stages', () => {
    const dayOne = applyWorldHouseholdGrowth(initialGameStateSnapshot, () => 0)
    const runtimeOne = resolveSiteRuntime(dayOne, 'site-world-house-sorn')
    const cellarOne = runtimeOne?.roomInstances.find((room) => room.roomId === 'sorn-locked-cellar')

    expect(runtimeOne?.tags).toContain('growth-stage:1')
    expect(cellarOne?.functionId).not.toBeNull()

    const daySix = applyWorldHouseholdGrowth(
      {
        ...dayOne,
        day: dayOne.day + 6,
      },
      () => 0,
    )
    const runtimeTwo = resolveSiteRuntime(daySix, 'site-world-house-sorn')
    const cellarTwo = runtimeTwo?.roomInstances.find((room) => room.roomId === 'sorn-locked-cellar')

    expect(runtimeTwo?.tags).toContain('growth-stage:2')
    expect(cellarTwo?.capacity).toBeGreaterThan(cellarOne?.capacity ?? 0)
    expect(runtimeTwo?.securityScore).toBeGreaterThan(runtimeOne?.securityScore ?? 0)
  })

  it('preserves non-player household growth through concretize and collapse-back', () => {
    const grown = applyWorldHouseholdGrowth(initialGameStateSnapshot, () => 0)
    const concretized = concretizeSite(grown, 'site-world-salt-ledger-hall')
    const collapsed = collapseSite(concretized, 'site-world-salt-ledger-hall')
    const runtime = resolveSiteRuntime(collapsed, 'site-world-salt-ledger-hall')

    expect(runtime?.mode).toBe('abstract')
    expect(runtime?.tags).toContain('growth-stage:1')
    expect(runtime?.roomInstances.some((room) => room.tags.includes('household-growth'))).toBe(true)
  })

  it('treats legitimacy contests as real growth pressure instead of letting rivals expand in parallel', () => {
    const contestedState = {
      ...initialGameStateSnapshot,
      lastFiredDay: {
        ...initialGameStateSnapshot.lastFiredDay,
        'site-growth:site-world-house-sable-cairn': initialGameStateSnapshot.day,
        'site-growth:site-world-salt-ledger-hall': initialGameStateSnapshot.day,
        'site-growth:site-world-house-sorn': initialGameStateSnapshot.day,
      },
    }

    const grown = applyWorldHouseholdGrowth(contestedState, () => 0)
    const runtime = resolveSiteRuntime(grown, 'site-world-house-merrow')

    expect(runtime).not.toBeNull()
    expect(runtime?.tags).toContain('growth-pressure:legitimacy-contest')
    expect(runtime?.tags).not.toContain('growth-stage:1')
    expect(runtime?.securityScore).toBeGreaterThan(50)
    expect(grown.districtTension['district-ash-quay']).toBeGreaterThan(0)
    expect(grown.cityDials.prosperity).toBeLessThan(contestedState.cityDials.prosperity)
  })

  it('makes committed households less likely to grow again even when their base resources look viable', () => {
    const runtime = resolveSiteRuntime(initialGameStateSnapshot, 'site-world-lantern-vale')
    expect(runtime).not.toBeNull()

    const burdenedState = {
      ...initialGameStateSnapshot,
      day: initialGameStateSnapshot.day + 6,
      siteRuntimes: {
        ...initialGameStateSnapshot.siteRuntimes,
        'site-world-lantern-vale': {
          ...runtime!,
          tags: [...runtime!.tags, 'growth-commitment:40'],
        },
      },
    }

    const grown = applyWorldHouseholdGrowth(burdenedState, () => 0.45)
    const burdenedRuntime = resolveSiteRuntime(grown, 'site-world-lantern-vale')

    expect(burdenedRuntime?.tags).not.toContain('growth-stage:1')
  })
})
