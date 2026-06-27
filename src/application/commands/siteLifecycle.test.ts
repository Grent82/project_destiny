import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { collapseSite, concretizeSite, materializeSiteRuntime, resolveSiteRuntime } from './siteLifecycle'
import { PLAYER_HOUSE_SITE_ID } from '../content/siteRuntime'

describe('site lifecycle', () => {
  it('materializes the same player-house runtime deterministically from state', () => {
    const first = materializeSiteRuntime(initialGameStateSnapshot, PLAYER_HOUSE_SITE_ID)
    const second = materializeSiteRuntime(initialGameStateSnapshot, PLAYER_HOUSE_SITE_ID)

    expect(first).toEqual(second)
    expect(first?.mode).toBe('concrete')
  })

  it('concretizes a household site and records the known room ids', () => {
    const next = concretizeSite(initialGameStateSnapshot, 'site-world-house-sorn')
    const runtime = next.siteRuntimes['site-world-house-sorn']

    expect(runtime).toBeDefined()
    expect(runtime?.mode).toBe('concrete')
    expect(runtime?.knownRoomIds.length).toBeGreaterThan(0)
    expect(runtime?.lastConcretizedDay).toBe(initialGameStateSnapshot.day)
  })

  it('collapse-back preserves durable room knowledge and captive references', () => {
    const concretized = concretizeSite(initialGameStateSnapshot, 'site-world-house-sorn')
    const withCaptive = {
      ...concretized,
      npcCaptivityStates: {
        ...concretized.npcCaptivityStates,
        'npc-mira': {
          status: 'captive' as const,
          holderId: 'faction-gilded-court',
          siteId: 'site-world-house-sorn',
          roomId: 'cellar',
          regime: 'guarded' as const,
          condition: 'hurt' as const,
          compliance: 'resistant' as const,
          bondType: 'fear' as const,
          timeHeldDays: 5,
          lastTransferDay: 2,
          questTag: 'quest-mira-rescue',
          confiscatedItems: [],
          confiscatedMoney: null,
          confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
        },
      },
    }

    const collapsed = collapseSite(withCaptive, 'site-world-house-sorn')
    const runtime = resolveSiteRuntime(collapsed, 'site-world-house-sorn')

    expect(runtime?.mode).toBe('abstract')
    expect(runtime?.knownRoomIds).toContain('cellar')
    expect(runtime?.lastCollapsedDay).toBe(initialGameStateSnapshot.day)
    expect(collapsed.npcCaptivityStates['npc-mira']?.siteId).toBe('site-world-house-sorn')
    expect(collapsed.npcCaptivityStates['npc-mira']?.roomId).toBe('cellar')
  })
})
