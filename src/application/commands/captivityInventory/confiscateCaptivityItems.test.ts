import { describe, it, expect } from 'vitest'

import { initialStateWithIda } from '../testFixtures'
import { confiscateCaptivityItems } from './confiscateCaptivityItems'
import { NPC_IDS } from '../../content/ids'

function makeState() {
  return initialStateWithIda
}

describe('confiscateCaptivityItems', () => {
  it('confiscates weapons and money for imprisonment regime', () => {
    const state = makeState()

    // Add an NPC with items to inventory
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
              slots: [
                { slotId: 'slot-1', itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
                { slotId: 'slot-2', itemInstanceId: 'item-coins-pouch', quantity: 100 },
                { slotId: 'slot-3', itemInstanceId: 'cloth-tunic-simple', quantity: 1 },
              ],
              locked: false,
            },
          ],
        },
      },
    }

    const result = confiscateCaptivityItems(stateWithNpc, {
      npcId,
      regime: 'guarded',
      confiscationType: 'imprisonment',
    })

    const npcContainers = result.inventoryState.npcInventories[npcId] || []
    const allSlots = npcContainers.flatMap((c) => c.slots)

    // Weapon should be confiscated
    expect(allSlots.find((s) => s.itemInstanceId === 'weapon-dagger-wasterunner')).toBeUndefined()
    // Money should be confiscated
    expect(allSlots.find((s) => s.itemInstanceId === 'item-coins-pouch')).toBeUndefined()
    // Basic clothing should remain
    expect(allSlots.find((s) => s.itemInstanceId === 'cloth-tunic-simple')).toBeDefined()

    // Activity log should have confiscation entry
    expect(result.activityLog.some((e) => e.message.includes('confiscated'))).toBe(true)
  })

  it('confiscates all items for penal regime with search', () => {
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
              slots: [
                { slotId: 'slot-1', itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
                { slotId: 'slot-2', itemInstanceId: 'item-coins-pouch', quantity: 100 },
                { slotId: 'slot-3', itemInstanceId: 'cloth-tunic-simple', quantity: 1 },
                { slotId: 'slot-4', itemInstanceId: 'item-rations', quantity: 5 },
              ],
              locked: false,
            },
          ],
        },
      },
    }

    const result = confiscateCaptivityItems(stateWithNpc, {
      npcId,
      regime: 'penal',
      confiscationType: 'search',
    })

    const npcContainers = result.inventoryState.npcInventories[npcId] || []
    const allSlots = npcContainers.flatMap((c) => c.slots)

    // All items should be confiscated in penal regime with search
    expect(allSlots).toHaveLength(0)
  })

  it('protects basic clothing in protective regime', () => {
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
              slots: [
                { slotId: 'slot-1', itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
                { slotId: 'slot-2', itemInstanceId: 'item-coins-pouch', quantity: 100 },
                { slotId: 'slot-3', itemInstanceId: 'cloth-tunic-simple', quantity: 1 },
              ],
              locked: false,
            },
          ],
        },
      },
    }

    const result = confiscateCaptivityItems(stateWithNpc, {
      npcId,
      regime: 'protective',
      confiscationType: 'kidnap',
    })

    const npcContainers = result.inventoryState.npcInventories[npcId] || []
    const allSlots = npcContainers.flatMap((c) => c.slots)

    // Weapon should be confiscated
    expect(allSlots.find((s) => s.itemInstanceId === 'weapon-dagger-wasterunner')).toBeUndefined()
    // Money should NOT be confiscated in protective regime
    expect(allSlots.find((s) => s.itemInstanceId === 'item-coins-pouch')).toBeDefined()
    // Basic clothing should remain
    expect(allSlots.find((s) => s.itemInstanceId === 'cloth-tunic-simple')).toBeDefined()
  })

  it('confiscates carried cash from personalFunds', () => {
    const state = makeState()

    const npcId = NPC_IDS.IDA_RHYS
    const stateWithNpc = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              personalFunds: {
                savings: 500,
                carriedCash: 100,
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
              slots: [
                { slotId: 'slot-1', itemInstanceId: 'item-coins-pouch', quantity: 50 },
              ],
              locked: false,
            },
          ],
        },
      },
    }

    const result = confiscateCaptivityItems(stateWithNpc, {
      npcId,
      regime: 'guarded',
      confiscationType: 'imprisonment',
    })

    const npc = result.roster.find((n) => n.npcId === npcId)
    expect(npc).toBeDefined()
    // Carried cash should be reduced
    expect(npc!.personalFunds.carriedCash).toBe(50) // 100 - 50 confiscated
    // Savings should remain untouched
    expect(npc!.personalFunds.savings).toBe(500)
  })

  it('returns state unchanged if NPC not found', () => {
    const state = makeState()

    const result = confiscateCaptivityItems(state, {
      npcId: 'non-existent-npc',
      regime: 'guarded',
      confiscationType: 'imprisonment',
    })

    expect(result).toEqual(state)
  })

  it('logs confiscation to activity log', () => {
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
              slots: [
                { slotId: 'slot-1', itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
              ],
              locked: false,
            },
          ],
        },
      },
    }

    const result = confiscateCaptivityItems(stateWithNpc, {
      npcId,
      regime: 'guarded',
      confiscationType: 'imprisonment',
    })

    const logEntry = result.activityLog.find((e) => e.message.includes('confiscated'))
    expect(logEntry).toBeDefined()
    expect(logEntry!.category).toBe('system')
  })
})
