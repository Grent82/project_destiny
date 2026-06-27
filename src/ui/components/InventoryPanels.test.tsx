import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { createGameStore } from '../../application/store/gameStore'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { AppProviders } from '../app/AppProviders'
import { HouseStoragePanel } from './HouseStoragePanel'
import { MissionPackPanel } from './MissionPackPanel'

function createInventoryWithHouseStorageItem(instanceId: string, itemId: string) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [{
      containerId: 'container-house-storage',
      containerType: 'vault' as ContainerType,
      ownerId: 'house_storage',
      maxSlots: 50,
      slots: [{
        slotId: `slot-${instanceId}`,
        itemInstanceId: instanceId,
        quantity: 1,
      }],
      locked: false,
    }],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] } },
  }
}

function createInventoryWithMissionPackItem(instanceId: string, itemId: string) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [{
      containerId: 'container-mission-pack',
      containerType: 'supply_pack' as ContainerType,
      ownerId: 'mission_pack',
      maxSlots: 20,
      slots: [{
        slotId: `slot-${instanceId}`,
        itemInstanceId: instanceId,
        quantity: 1,
      }],
      locked: false,
    }],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] } },
  }
}

function renderWithStore(ui: React.ReactNode, state = initialGameStateSnapshot) {
  const store = createGameStore(state)
  render(<AppProviders store={store}>{ui}</AppProviders>)
  return store
}

describe('HouseStoragePanel', () => {
  it('opens a document preview for inventory documents', async () => {
    const user = userEvent.setup()
    const stateWithDocument = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-ledger-house-debt', 'item-ledger-house-debt'),
    }
    renderWithStore(<HouseStoragePanel />, stateWithDocument)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const preview = screen.getByRole('dialog', { name: 'House Debt Ledger preview' })
    expect(within(preview).getByText('House Debt Ledger')).toBeInTheDocument()
    expect(within(preview).getByText(/not the missing bureau evidence/i)).toBeInTheDocument()
  })
})

describe('MissionPackPanel', () => {
  it('opens a document preview for packed documents', async () => {
    const user = userEvent.setup()
    const packedState = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithMissionPackItem('inst-ledger-house-debt', 'item-ledger-house-debt'),
    }

    renderWithStore(<MissionPackPanel />, packedState)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const preview = screen.getByRole('dialog', { name: 'House Debt Ledger preview' })
    expect(within(preview).getByText('House Debt Ledger')).toBeInTheDocument()
    expect(within(preview).getByText(/not the missing bureau evidence/i)).toBeInTheDocument()
  })
})
