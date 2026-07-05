import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { createRuntimeStateFromDefinition } from './createRuntimeStateFromDefinition'
import { applySiteStateHooks, SITE_PRESSURE_EVENT_ID } from './applySiteStateHooks'
import { collapseSite, concretizeSite } from './siteLifecycle'

function orrenWexCaptive(overrides: { timeHeldDays: number; lastTransferDay: number }) {
  return createRuntimeStateFromDefinition('npc-orren-wex', {
    playerRosterMember: false,
    captivityState: {
      status: 'captive' as const,
      holderId: 'faction-civic-compact',
      siteId: 'site-world-house-sorn',
      roomId: 'sorn-locked-cellar',
      regime: 'guarded' as const,
      condition: 'hurt' as const,
      compliance: 'resistant' as const,
      bondType: 'fear' as const,
      timeHeldDays: overrides.timeHeldDays,
      lastTransferDay: overrides.lastTransferDay,
      questTag: 'quest-orren-wex-rescue',
      confiscatedItems: [],
      confiscatedMoney: null,
      confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
    },
  })
}

describe('applySiteStateHooks', () => {
  it('surfaces a generated rumor when captivity is anchored to an abstract site but the room is not yet known', () => {
    const state = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: [...initialGameStateSnapshot.npcRuntimeStates, orrenWexCaptive({ timeHeldDays: 3, lastTransferDay: 1 })],
    }

    const next = applySiteStateHooks(state)

    expect(next.availableQuestLeads.some((lead) => lead.questId === 'quest-orren-wex-rescue')).toBe(false)
    expect(next.rumors.some((rumor) => rumor.eventSource === 'site-captivity-rumor:npc-orren-wex:site-world-house-sorn')).toBe(
      true,
    )
  })

  it('creates a quest lead when custody is tied to a known room in a concretized-or-collapsed site runtime', () => {
    const concretized = concretizeSite(initialGameStateSnapshot, 'site-world-house-sorn')
    const collapsed = collapseSite(
      {
        ...concretized,
        npcRuntimeStates: [...concretized.npcRuntimeStates, orrenWexCaptive({ timeHeldDays: 5, lastTransferDay: 2 })],
      },
      'site-world-house-sorn',
    )

    const next = applySiteStateHooks(collapsed)

    const lead = next.availableQuestLeads.find((entry) => entry.questId === 'quest-orren-wex-rescue')
    expect(lead).toBeDefined()
    expect(lead?.discoverySource).toBe('event')
    expect(lead?.discoveryDistrictId).toBe('district-the-northbank')
  })

  it('queues a site-pressure event for sanctuary or safehouse locations carrying protected people', () => {
    const state = {
      ...initialGameStateSnapshot,
      npcSitePresences: [
        ...initialGameStateSnapshot.npcSitePresences,
        {
          occupancyId: 'occ-shelter-1',
          npcId: 'npc-marion-vale',
          siteId: 'site-world-chapel-saint-vey',
          roomId: 'chapel-infirmary',
          role: 'sheltered' as const,
          visibility: 'discreet' as const,
          status: 'present' as const,
          sinceDay: 1,
        },
      ],
    }

    const next = applySiteStateHooks(state)

    expect(next.pendingEvents.some((event) => event.eventId === SITE_PRESSURE_EVENT_ID)).toBe(true)
    expect(next.pendingEvents.find((event) => event.eventId === SITE_PRESSURE_EVENT_ID)?.instanceId).toBeTruthy()
    const instance = next.eventInstances.find((event) => event.eventId === SITE_PRESSURE_EVENT_ID)
    expect(instance?.contextId).toBe('site-world-chapel-saint-vey')
    expect(instance?.presentationText).toContain('Chapel of Saint Vey')
  })
})
