import { describe, expect, it } from 'vitest'

import { contentCatalog } from '../content/contentCatalog'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyWorldHouseholdGrowth } from './applyWorldHouseholdGrowth'
import { collapseSite, concretizeSite, resolveSiteRuntime } from './siteLifecycle'

describe('applyWorldHouseholdGrowth', () => {
  it('lets funded world households add new rooms and stronger security over time', () => {
    const household = contentCatalog.worldHouseholdsById.get('world-house-sable-cairn')
    expect(household).toBeDefined()

    const grown = applyWorldHouseholdGrowth(initialGameStateSnapshot, () => 0)
    const runtime = resolveSiteRuntime(grown, 'site-world-house-sable-cairn')

    expect(runtime).not.toBeNull()
    expect(runtime?.tags).toContain('growth-stage:1')
    expect(runtime?.securityScore).toBeGreaterThan(household!.security)
    expect(runtime?.roomInstances.some((room) => room.tags.includes('household-growth'))).toBe(true)
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
    const concretized = concretizeSite(grown, 'site-world-house-sable-cairn')
    const collapsed = collapseSite(concretized, 'site-world-house-sable-cairn')
    const runtime = resolveSiteRuntime(collapsed, 'site-world-house-sable-cairn')

    expect(runtime?.mode).toBe('abstract')
    expect(runtime?.tags).toContain('growth-stage:1')
    expect(runtime?.roomInstances.some((room) => room.tags.includes('household-growth'))).toBe(true)
  })
})
