import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { createGameStore } from '../../application/store/gameStore'
import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from '../../application/commands/inventory/householdStorage'
import { AppProviders } from '../app/AppProviders'
import { ItemSelectionModal } from './ItemSelectionModal'

const NPC_ID = 'npc-marion-vale'

function stateWithHouseStorage(items: Array<{ instanceId: string; itemId: string }>) {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      sharedContainers: [{
        containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        containerType: 'chest' as ContainerType,
        ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        maxSlots: 50,
        slots: items.map((item) => ({ slotId: `slot-${item.instanceId}`, itemInstanceId: item.instanceId, quantity: 1 })),
        locked: false,
      }],
      itemRegistry: Object.fromEntries(items.map((item) => [
        item.instanceId,
        { uniqueId: item.instanceId, itemId: item.itemId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] },
      ])),
    },
  }
}

function stateWithNpcPersonalItems(items: Array<{ instanceId: string; itemId: string }>) {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      npcInventories: {
        [NPC_ID]: [{
          containerId: `container-${NPC_ID}`,
          containerType: 'backpack' as ContainerType,
          ownerId: NPC_ID,
          maxSlots: 20,
          slots: items.map((item) => ({ slotId: `slot-${item.instanceId}`, itemInstanceId: item.instanceId, quantity: 1 })),
          locked: false,
        }],
      },
      itemRegistry: Object.fromEntries(items.map((item) => [
        item.instanceId,
        { uniqueId: item.instanceId, itemId: item.itemId, quantity: 1, locationType: 'npc_inventory' as const, acquiredDay: 1, flags: [] },
      ])),
    },
  }
}

function stateWithBothSources(houseItems: Array<{ instanceId: string; itemId: string }>, npcItems: Array<{ instanceId: string; itemId: string }>) {
  const houseState = stateWithHouseStorage(houseItems)
  const npcState = stateWithNpcPersonalItems(npcItems)
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      sharedContainers: houseState.inventoryState.sharedContainers,
      npcInventories: npcState.inventoryState.npcInventories,
      itemRegistry: { ...houseState.inventoryState.itemRegistry, ...npcState.inventoryState.itemRegistry },
    },
  }
}

function renderModal(state = initialGameStateSnapshot, slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId' = 'armorId', onClose = vi.fn()) {
  const store = createGameStore(state)
  render(
    <AppProviders store={store}>
      <ItemSelectionModal npcId={NPC_ID} slot={slot} onClose={onClose} />
    </AppProviders>,
  )
  return { store, onClose }
}

describe('ItemSelectionModal', () => {
  it('shows "Armor" as the title for the armor slot', () => {
    renderModal(initialGameStateSnapshot, 'armorId')
    expect(screen.getByRole('heading', { name: 'Armor' })).toBeInTheDocument()
  })

  it('shows "Primary Weapon" for the primaryWeaponId slot', () => {
    renderModal(initialGameStateSnapshot, 'primaryWeaponId')
    expect(screen.getByRole('heading', { name: 'Primary Weapon' })).toBeInTheDocument()
  })

  it('shows "Secondary Weapon" for the secondaryWeaponId slot', () => {
    renderModal(initialGameStateSnapshot, 'secondaryWeaponId')
    expect(screen.getByRole('heading', { name: 'Secondary Weapon' })).toBeInTheDocument()
  })

  it('shows the empty-state message mentioning both House Storage and the operative when neither has weapons', () => {
    renderModal(initialGameStateSnapshot, 'primaryWeaponId')
    expect(screen.getByText(/No weapons in House Storage or on this operative/)).toBeInTheDocument()
  })

  it('shows the empty-state message mentioning both sources when neither has armor', () => {
    renderModal(initialGameStateSnapshot, 'armorId')
    expect(screen.getByText(/No armor in House Storage or on this operative/)).toBeInTheDocument()
  })

  it('lists a House Storage armor item labeled "(House Storage)"', () => {
    const state = stateWithHouseStorage([{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat' }])
    renderModal(state, 'armorId')
    expect(screen.getByRole('button', { name: /\(House Storage\)/ })).toBeInTheDocument()
  })

  it('lists an armor item sitting in the NPC\'s own personal inventory labeled "(Personal)"', () => {
    const state = stateWithNpcPersonalItems([{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat' }])
    renderModal(state, 'armorId')
    expect(screen.getByRole('button', { name: /\(Personal\)/ })).toBeInTheDocument()
  })

  it('lists a weapon sitting in the NPC\'s own personal inventory labeled "(Personal)" for the primary weapon slot', () => {
    const state = stateWithNpcPersonalItems([{ instanceId: 'inst-dagger-01', itemId: 'weapon-dagger-wasterunner' }])
    renderModal(state, 'primaryWeaponId')
    expect(screen.getByRole('button', { name: /\(Personal\)/ })).toBeInTheDocument()
  })

  // Same underlying item definition, two distinct real instances, one in each source -- both must
  // render as separate, independently selectable options (no dedup-by-itemId, no key collision).
  it('lists both a House Storage copy and a Personal copy of the same armor id as two separate options', () => {
    const state = stateWithBothSources(
      [{ instanceId: 'inst-coat-house', itemId: 'armor-light-tallow-work-coat' }],
      [{ instanceId: 'inst-coat-personal', itemId: 'armor-light-tallow-work-coat' }],
    )
    renderModal(state, 'armorId')
    expect(screen.getByRole('button', { name: /\(House Storage\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\(Personal\)/ })).toBeInTheDocument()
    // Two distinct armor option buttons, not a single deduplicated one (plus the "Unequip" button).
    const armorButtons = screen.getAllByRole('button', { name: /Tallow/ })
    expect(armorButtons).toHaveLength(2)
  })

  it('does not list a weapon in the armor tab or an armor piece in the weapon tab', () => {
    const state = stateWithBothSources(
      [{ instanceId: 'inst-dagger-house', itemId: 'weapon-dagger-wasterunner' }],
      [{ instanceId: 'inst-coat-personal', itemId: 'armor-light-tallow-work-coat' }],
    )
    renderModal(state, 'armorId')
    expect(screen.queryByText(/Waste-Runner/)).not.toBeInTheDocument()
    expect(screen.getByText(/Tallow/)).toBeInTheDocument()
  })

  it('dispatches equipItem with the selected instance id and closes the modal', async () => {
    const user = userEvent.setup()
    const state = stateWithHouseStorage([{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat' }])
    const { store, onClose } = renderModal(state, 'armorId')

    await user.click(screen.getByRole('button', { name: /\(House Storage\)/ }))

    const npc = store.getState().game.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBe('inst-coat-01')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dispatches equipItem for a Personal-source item and closes the modal', async () => {
    const user = userEvent.setup()
    const state = stateWithNpcPersonalItems([{ instanceId: 'inst-coat-personal', itemId: 'armor-light-tallow-work-coat' }])
    const { store, onClose } = renderModal(state, 'armorId')

    await user.click(screen.getByRole('button', { name: /\(Personal\)/ }))

    const npc = store.getState().game.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBe('inst-coat-personal')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dispatches an unequip (itemId null) and closes the modal when nothing is equipped (no-op on the command, but the picker itself must not crash)', async () => {
    const user = userEvent.setup()
    const { store, onClose } = renderModal(initialGameStateSnapshot, 'armorId')

    await user.click(screen.getByRole('button', { name: '— Unequip' }))

    const npc = store.getState().game.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes the modal via the Close button without equipping anything', async () => {
    const user = userEvent.setup()
    const state = stateWithHouseStorage([{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat' }])
    const { store, onClose } = renderModal(state, 'armorId')

    await user.click(screen.getByRole('button', { name: 'Close' }))

    const npc = store.getState().game.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes the modal when clicking the overlay backdrop', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal(initialGameStateSnapshot, 'armorId')

    // The overlay is the outermost div; querying by class since it has no accessible role of its own.
    const overlay = document.querySelector('.event-modal-overlay')!
    await user.click(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close the modal when clicking inside the modal content itself', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal(initialGameStateSnapshot, 'armorId')

    await user.click(screen.getByRole('heading', { name: 'Armor' }))

    expect(onClose).not.toHaveBeenCalled()
  })
})
