import { describe, it, expect } from 'vitest'

import { initialStateWithIda } from '../testFixtures'
import { applyCaptivityRestitution } from './applyCaptivityRestitution'
import { NPC_IDS } from '../../content/ids'

function makeState() {
  return initialStateWithIda
}

describe('applyCaptivityRestitution', () => {
  it('returns items on release for guarded regime', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          [npcId]: [
            {
              containerId: 'container-1',
              containerType: 'backpack' as const,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
      },
    }

    const result = applyCaptivityRestitution(stateWithNpc, {
      npcId,
      regime: 'guarded',
      releasedBy: 'rescue',
    })

    const npcContainers = result.inventoryState.npcInventories[npcId] || []
    const allSlots = npcContainers.flatMap((c) => c.slots)

    // Items should be returned
    expect(allSlots.length).toBeGreaterThan(0)

    // Activity log should have restitution entry
    expect(result.activityLog.some((e) => e.message.includes('returned'))).toBe(true)
  })

  it('returns money on acquittal for guarded regime', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              personalFunds: {
                savings: 500,
                carriedCash: 0,
                lastWagePaymentDay: null,
                lastTipAmount: 0,
              },
            }
          : n,
      ),
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          [npcId]: [
            {
              containerId: 'container-1',
              containerType: 'backpack' as const,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
      },
    }

    const result = applyCaptivityRestitution(stateWithNpc, {
      npcId,
      regime: 'guarded',
      releasedBy: 'acquittal',
    })

    const npc = result.npcRuntimeStates.find((n) => n.npcId === npcId)
    expect(npc).toBeDefined()
    // Money should be returned to carriedCash
    expect(npc!.personalFunds.carriedCash).toBeGreaterThan(0)
  })

  it('does not return items for penal regime (retained by captors)', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          [npcId]: [
            {
              containerId: 'container-1',
              containerType: 'backpack' as const,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
      },
    }

    const result = applyCaptivityRestitution(stateWithNpc, {
      npcId,
      regime: 'penal',
      releasedBy: 'rescue',
    })

    // Activity log should indicate items retained by captors
    expect(result.activityLog.some((e) => e.message.includes('retained by captors'))).toBe(true)
  })

  it('returns items on escape for protective regime', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          [npcId]: [
            {
              containerId: 'container-1',
              containerType: 'backpack' as const,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
      },
    }

    const result = applyCaptivityRestitution(stateWithNpc, {
      npcId,
      regime: 'protective',
      releasedBy: 'escape',
    })

    const npcContainers = result.inventoryState.npcInventories[npcId] || []
    const allSlots = npcContainers.flatMap((c) => c.slots)

    // Items should be returned on escape for protective regime
    expect(allSlots.length).toBeGreaterThan(0)
  })

  it('returns state unchanged if NPC not found', () => {
    const state = makeState()

    const result = applyCaptivityRestitution(state, {
      npcId: 'non-existent-npc',
      regime: 'guarded',
      releasedBy: 'rescue',
    })

    expect(result).toEqual(state)
  })

  it('logs restitution to activity log', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      inventoryState: {
        ...state.inventoryState,
        npcInventories: {
          [npcId]: [
            {
              containerId: 'container-1',
              containerType: 'backpack' as const,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
      },
    }

    const result = applyCaptivityRestitution(stateWithNpc, {
      npcId,
      regime: 'guarded',
      releasedBy: 'rescue',
    })

    const logEntry = result.activityLog.find((e) => e.message.includes('returned'))
    expect(logEntry).toBeDefined()
    expect(logEntry!.category).toBe('system')
  })
})
