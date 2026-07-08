import { describe, expect, it } from 'vitest'
import type { GameState } from '../../../domain/game/contracts'
import type { ContainerType } from '../../../domain/inventory/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'
import { findPlayerItem, removePlayerItem } from './inventoryHelpers'

function stateWithSharedContainerItem(ownerId: 'house_storage' | 'mission_pack', instanceId: string, itemId: string, quantity = 1): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
      },
      sharedContainers: [{
        containerId: `container-${ownerId}`,
        containerType: (ownerId === 'house_storage' ? 'vault' : 'supply_pack') as ContainerType,
        ownerId,
        maxSlots: 50,
        slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity }],
        locked: false,
      }],
      itemRegistry: { [instanceId]: { uniqueId: instanceId, itemId, quantity, locationType: 'container', acquiredDay: 1, flags: [] } },
    },
  }
}

describe('findPlayerItem (destiny-yiqa)', () => {
  it('finds an item in house_storage and resolves its real itemId from itemRegistry', () => {
    const state = stateWithSharedContainerItem('house_storage', 'inst-medkit-01', 'item-medkit-field')
    const found = findPlayerItem(state, 'inst-medkit-01')
    expect(found).not.toBeNull()
    expect(found?.location).toBe('shared')
    expect(found?.instance.itemId).toBe('item-medkit-field')
  })

  it('finds an item in mission_pack and resolves its real itemId from itemRegistry', () => {
    const state = stateWithSharedContainerItem('mission_pack', 'inst-medkit-02', 'item-medkit-field')
    const found = findPlayerItem(state, 'inst-medkit-02')
    expect(found).not.toBeNull()
    expect(found?.location).toBe('shared')
  })

  it('returns null when the instanceId exists nowhere', () => {
    expect(findPlayerItem(initialGameStateSnapshot, 'nonexistent')).toBeNull()
  })
})

describe('removePlayerItem (destiny-yiqa)', () => {
  it('removes an item from house_storage (previously only bagContainers was searched)', () => {
    const state = stateWithSharedContainerItem('house_storage', 'inst-medkit-01', 'item-medkit-field')
    const result = removePlayerItem(state, 'inst-medkit-01')

    expect(result.inventoryState.sharedContainers[0]!.slots).toHaveLength(0)
    expect(result.inventoryState.itemRegistry['inst-medkit-01']).toBeUndefined()
  })

  it('removes an item from mission_pack', () => {
    const state = stateWithSharedContainerItem('mission_pack', 'inst-medkit-02', 'item-medkit-field')
    const result = removePlayerItem(state, 'inst-medkit-02')

    expect(result.inventoryState.sharedContainers[0]!.slots).toHaveLength(0)
  })

  it('decrements quantity instead of removing when more than the requested amount remain', () => {
    const state = stateWithSharedContainerItem('house_storage', 'inst-stack-01', 'item-medkit-field', 3)
    const result = removePlayerItem(state, 'inst-stack-01', 1)

    expect(result.inventoryState.sharedContainers[0]!.slots[0]?.quantity).toBe(2)
    expect(result.inventoryState.itemRegistry['inst-stack-01']?.quantity).toBe(2)
  })

  it('is a no-op when the item does not exist anywhere', () => {
    const result = removePlayerItem(initialGameStateSnapshot, 'nonexistent')
    expect(result).toBe(initialGameStateSnapshot)
  })
})
