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

// Shop-purchased weapons/armor land here (equipmentPurchase.ts), a container distinct from the
// generic ownerId:'house_storage' one used by createInventoryWithHouseStorageItem above.
function createInventoryWithHouseholdStorageContainerItem(instanceId: string, itemId: string) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [{
      containerId: 'household:house-blackthorn:storage',
      containerType: 'chest' as ContainerType,
      ownerId: 'household:house-blackthorn:storage',
      maxSlots: 50,
      slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
      locked: false,
    }],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] } },
  }
}

function createInventoryWithPlayerBagItem(instanceId: string, itemId: string) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [{
        containerId: 'container-player-bag',
        containerType: 'backpack' as ContainerType,
        ownerId: 'player',
        maxSlots: 20,
        slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
        locked: false,
      }],
      usedBagSlots: 1,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity: 1, locationType: 'player_inventory' as const, acquiredDay: 1, flags: [] } },
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

  // User report, live-reproduced (2026-07-09): a weapon bought via the shop's Equipment Stash was
  // visible in this panel but the "Equip" button did nothing. Root cause: selectItemActions never
  // recognized the HOUSEHOLD_STORAGE_CONTAINER_ID container as house storage, so `owned` stayed
  // null and the item got zero actions at all -- not just a broken Equip, no button rendered.
  it('opens a target picker for Equip on a shop-purchased weapon and equips it on the chosen NPC', async () => {
    const user = userEvent.setup()
    const stateWithWeapon = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseholdStorageContainerItem('inst-knife-01', 'weapon-dagger-wasterunner'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithWeapon)

    await user.click(screen.getByRole('button', { name: 'Equip' }))
    expect(screen.getByRole('dialog', { name: 'Choose a target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Marion Vale' }))

    const marion = store.getState().game.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')!
    expect(marion.equipment.weapon).toBe('inst-knife-01')
    expect(marion.loadout.primaryWeaponId).toBe('weapon-dagger-wasterunner')
  })

  it('opens a target picker for Equip on shop-purchased armor and equips it on the chosen NPC', async () => {
    const user = userEvent.setup()
    const stateWithArmor = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseholdStorageContainerItem('inst-coat-01', 'armor-light-tallow-work-coat'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithArmor)

    await user.click(screen.getByRole('button', { name: 'Equip' }))
    await user.click(screen.getByRole('button', { name: 'Marion Vale' }))

    const marion = store.getState().game.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')!
    expect(marion.equipment.armor).toBe('inst-coat-01')
  })

  // Tools equip onto the player, not a roster NPC (equipItemToPlayer is the only path that applies
  // typedEffects skillBonus/enableAction, destiny-1g74) -- no target picker should appear.
  it('equips a tool directly onto the player with no target picker', async () => {
    const user = userEvent.setup()
    const stateWithTool = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithPlayerBagItem('inst-lockpick-01', 'item-lockpick-ringcut'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithTool)

    await user.click(screen.getByRole('button', { name: 'Equip' }))

    expect(screen.queryByRole('dialog', { name: 'Choose a target' })).not.toBeInTheDocument()
    expect(store.getState().game.inventoryState.player.equipmentSlots.accessory_1).toBe('inst-lockpick-01')
  })

  // Confirmed live (2026-07-09, destiny-yx750): items carried in the player's own bag were rendered
  // in this same list under the "House Storage" heading, but the "Stored: X/40" badge only counted
  // the real house-storage container -- so the count and the visible list disagreed. Split into two
  // labeled sections so what's counted and what's shown always match.
  it('renders personal-inventory items under a separate "Carried" section, not counted as House Storage', () => {
    const stateWithCarriedItem = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithPlayerBagItem('inst-lockpick-01', 'item-lockpick-ringcut'),
    }
    renderWithStore(<HouseStoragePanel />, stateWithCarriedItem)

    expect(screen.getByText('Stored: 0 / 50')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Carried' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Carried items' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Stored items' })).toHaveTextContent('House Storage is empty')
  })

  // Test-quality pass (destiny-ukh4e): capacity badge previously only tested at 0/N (empty) --
  // never at the exact maxSlots boundary.
  it('shows the capacity badge at exactly maxSlots when House Storage is full', () => {
    const fullState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [{
          containerId: 'household:house-blackthorn:storage',
          containerType: 'chest' as ContainerType,
          ownerId: 'household:house-blackthorn:storage',
          maxSlots: 1,
          slots: [{ slotId: 'slot-existing', itemInstanceId: 'inst-existing', quantity: 1 }],
          locked: false,
        }],
        itemRegistry: { 'inst-existing': { itemId: 'item-lockpick-ringcut', uniqueId: 'inst-existing', quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] } },
      },
    }
    renderWithStore(<HouseStoragePanel />, fullState)
    expect(screen.getByText('Stored: 1 / 1')).toBeInTheDocument()
  })

  it('opens a target picker for Give on a gift-category item and dispatches it to the chosen NPC', async () => {
    const user = userEvent.setup()
    const stateWithGift = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-ink-01', 'item-gift-fine-ink'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithGift)

    await user.click(screen.getByRole('button', { name: 'Give' }))
    expect(screen.getByRole('dialog', { name: 'Choose a target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Marion Vale' }))

    // Item leaves House Storage and lands with the chosen NPC once given.
    const stillInAnyHouseStorage = store.getState().game.inventoryState.sharedContainers.some((c) => c.slots.some((s) => s.itemInstanceId === 'inst-ink-01'))
    expect(stillInAnyHouseStorage).toBe(false)
    expect(store.getState().game.inventoryState.itemRegistry['inst-ink-01']?.locationType).toBe('npc_inventory')
  })

  it('sells a tradeGood item via the confirmation modal and credits money', async () => {
    const user = userEvent.setup()
    const stateWithTradeGood = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-parts-01', 'item-spare-parts'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithTradeGood)
    const moneyBefore = store.getState().game.money

    await user.click(screen.getByRole('button', { name: 'Sell' }))
    expect(screen.getByRole('heading', { name: /^Sell/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sell item' }))

    expect(store.getState().game.money).toBeGreaterThan(moneyBefore)
    expect(store.getState().game.inventoryState.itemRegistry['inst-parts-01']).toBeUndefined()
  })

  it('cancelling the sell confirmation leaves the item and money untouched', async () => {
    const user = userEvent.setup()
    const stateWithTradeGood = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-parts-01', 'item-spare-parts'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithTradeGood)
    const moneyBefore = store.getState().game.money

    await user.click(screen.getByRole('button', { name: 'Sell' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(store.getState().game.money).toBe(moneyBefore)
    expect(store.getState().game.inventoryState.itemRegistry['inst-parts-01']).toBeDefined()
  })

  it('moves a House Storage item into the Mission Pack via the "Add to Pack" secondary action', async () => {
    const user = userEvent.setup()
    const stateWithTool = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithHouseStorageItem('inst-lockpick-01', 'item-lockpick-ringcut'),
    }
    const store = renderWithStore(<HouseStoragePanel />, stateWithTool)

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Add to Pack' }))

    const registryEntry = store.getState().game.inventoryState.itemRegistry['inst-lockpick-01']
    expect(registryEntry?.locationType).toBe('container')
    const missionPackContainer = store.getState().game.inventoryState.sharedContainers.find((c) => c.ownerId === 'mission_pack')
    expect(missionPackContainer?.slots.some((s) => s.itemInstanceId === 'inst-lockpick-01')).toBe(true)
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

  // A packed weapon must be unpacked to House Storage before it can be equipped -- 'equip' must
  // not leak into the secondary "..." menu here (its own TargetPickerModal.onSelect doesn't handle
  // 'equip' at all, so it would silently no-op, same shape as the House Storage bug just fixed).
  it('does not offer Equip for a packed weapon, only Remove from Pack', () => {
    const packedWeaponState = {
      ...initialGameStateSnapshot,
      inventoryState: createInventoryWithMissionPackItem('inst-knife-01', 'weapon-dagger-wasterunner'),
    }
    renderWithStore(<MissionPackPanel />, packedWeaponState)

    expect(screen.queryByRole('button', { name: 'Equip' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Equip' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove from Pack' })).toBeInTheDocument()
  })
})
