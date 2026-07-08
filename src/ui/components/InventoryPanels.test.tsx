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

  // destiny-yiqa: clicking 'Use' on a consumable previously dispatched nothing at all.
  it('opens a target picker for Use on a heal consumable and applies the heal on the chosen NPC', async () => {
    const user = userEvent.setup()
    const stateWithMedkit = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-medkit-01', 'item-medkit-field'),
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, states: { ...npc.states, health: 60 } } : npc,
      ),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithMedkit)

    await user.click(screen.getByRole('button', { name: 'Use' }))
    expect(screen.getByRole('dialog', { name: 'Choose a target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Marion Vale' }))

    const marion = store.getState().game.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')!
    expect(marion.states.health).toBeGreaterThan(60)
    // The item is consumed: no longer present in house storage.
    expect(store.getState().game.inventoryState.itemRegistry['inst-medkit-01']).toBeUndefined()
  })

  it('does not offer a Use button for a contraception-only item (destiny-yiqa)', () => {
    const stateWithContraceptive = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-contra-01', 'item-contraceptive-tonic'),
    }
    renderWithStore(<HouseStoragePanel />, stateWithContraceptive)

    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument()
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

  // destiny-yiqa: a packed consumable's 'Use' action (reached via the secondary "More actions"
  // menu, since MissionPackPanel's primary slot is reserved for open/unpack) previously did nothing.
  it('dispatches Use from the secondary menu and applies the heal on the chosen NPC', async () => {
    const user = userEvent.setup()
    const packedMedkitState = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithMissionPackItem('inst-medkit-01', 'item-medkit-field'),
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, states: { ...npc.states, health: 60 } } : npc,
      ),
    }
    const store = renderWithStore(<MissionPackPanel />, packedMedkitState)

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Use' }))
    expect(screen.getByRole('dialog', { name: 'Choose a target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Marion Vale' }))

    const marion = store.getState().game.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')!
    expect(marion.states.health).toBeGreaterThan(60)
  })
})
