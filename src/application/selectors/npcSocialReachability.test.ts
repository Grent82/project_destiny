import { describe, it, expect } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { idaRhysRosterEntry } from '../commands/testFixtures'
import { selectNpcSocialReachability } from './npcSocialReachability'

function storeWithIda(overrides: Partial<typeof idaRhysRosterEntry> = {}) {
  return createGameStore({
    ...initialGameStateSnapshot,
    npcRuntimeStates: [...initialGameStateSnapshot.npcRuntimeStates, { ...idaRhysRosterEntry, ...overrides }],
  })
}

describe('selectNpcSocialReachability', () => {
  it('is fully eligible for an idle NPC at the house', () => {
    const store = storeWithIda()
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('eligible')
    expect(result.canConverseRemotely).toBe(true)
    expect(result.canUsePrivateActions).toBe(true)
    expect(result.blockerMessage).toBeNull()
  })

  it('blocks private actions but allows conversation for a deployed NPC assigned to another district', () => {
    const store = storeWithIda({ assignment: 'deployed', assignedDistrictId: 'district-harbor' })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('assigned-other-district')
    expect(result.canConverseRemotely).toBe(true)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/Harbor/i)
  })

  it('blocks private actions for a transferred NPC', () => {
    const store = storeWithIda({ assignment: 'transferred' })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('transferred')
    expect(result.canConverseRemotely).toBe(true)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/transferred/i)
  })

  it('blocks private actions for an NPC assigned to work in another district', () => {
    const store = storeWithIda({ assignment: 'working', assignedDistrictId: 'district-ironworks' })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('assigned-other-district')
    expect(result.canConverseRemotely).toBe(true)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/Ironworks/i)
  })

  it('blocks private actions when the player is away from the house', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      npcRuntimeStates: [...initialGameStateSnapshot.npcRuntimeStates, idaRhysRosterEntry],
    })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('player-away-from-house')
    expect(result.canConverseRemotely).toBe(true)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/Return to the house/i)
  })

  it('blocks conversation and private actions entirely for a captive NPC', () => {
    const store = storeWithIda({
      captivityState: {
        status: 'captive',
        holderId: 'holder-001',
        siteId: 'site-1',
        roomId: 'room-1',
        regime: 'guarded',
        condition: 'hurt',
        compliance: 'resistant',
        bondType: 'fear',
        timeHeldDays: 2,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('captive')
    expect(result.canConverseRemotely).toBe(false)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/held captive/i)
  })

  it('blocks conversation and private actions entirely for a missing NPC', () => {
    const store = storeWithIda({
      captivityState: {
        status: 'missing',
        holderId: null,
        siteId: null,
        roomId: null,
        regime: 'unknown',
        condition: 'healthy',
        compliance: 'resistant',
        bondType: 'none',
        timeHeldDays: 0,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const result = selectNpcSocialReachability(idaRhysRosterEntry.npcId)(store.getState())

    expect(result.reason).toBe('missing')
    expect(result.canConverseRemotely).toBe(false)
    expect(result.canUsePrivateActions).toBe(false)
    expect(result.blockerMessage).toMatch(/missing/i)
  })
})
