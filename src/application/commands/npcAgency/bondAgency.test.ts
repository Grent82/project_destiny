import { describe, expect, it } from 'vitest'
import { applyBondAgency } from './bondAgency'
import { initialStateWithIda, worldNpcRuntimeEntry } from '../testFixtures'

describe('applyBondAgency', () => {
  it('never builds loyalty between a working roster NPC and a captive or non-roster person sharing the unified list (destiny-rama.12)', () => {
    const captive = worldNpcRuntimeEntry('npc-test-captive-bond', {
      captivityState: {
        status: 'captive', holderId: null, siteId: null, roomId: null, regime: 'unknown',
        condition: 'healthy', compliance: 'resistant', bondType: 'none', timeHeldDays: 1,
        lastTransferDay: null, questTag: null, confiscatedItems: [], confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const worldNpc = worldNpcRuntimeEntry('npc-test-world-bond')
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: [
        ...initialStateWithIda.npcRuntimeStates.map((n) => ({ ...n, assignment: 'working' as const })),
        captive,
        worldNpc,
      ],
    }

    // Force every probability gate to succeed.
    const alwaysTrigger = () => 0
    const result = applyBondAgency(state, alwaysTrigger)

    const captiveKeys = Object.keys(result.relationships).filter(
      (key) => key.includes('npc-test-captive-bond') || key.includes('npc-test-world-bond'),
    )
    expect(captiveKeys).toHaveLength(0)
  })
})
