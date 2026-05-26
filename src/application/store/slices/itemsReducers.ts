import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import type { OwnedItemLocation } from '../../../domain/items/contracts'
import { getWeaponRepairCost, getArmorRepairCost } from '../../content/equipmentCatalog'
import { searchHouseRoom } from '../../commands/houseSearch'
import { useItem as useItemCommand } from '../../commands/useItem'
import { sellItem as sellItemCommand } from '../../commands/sellItem'
import { giftItemToNpc as giftItemToNpcCommand } from '../../commands/giftItem'
import { installModule as installModuleCommand } from '../../commands/installModule'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

export const itemsReducers = {
  equipItem(
    state: GameState,
    action: PayloadAction<{ npcId: string; slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'; itemId: string | null }>,
  ) {
    const { npcId, slot, itemId } = action.payload
    const npcState = state.roster.find((n) => n.npcId === npcId)
    if (!npcState) return
    npcState.loadout[slot] = itemId
  },

  addToStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string; price: number }>) {
    const { type, id, price } = action.payload
    if (state.money < price) return
    const alreadyOwned = state.ownedItems.some((o) => o.itemId === id && o.location === 'house_storage')
    if (!alreadyOwned) {
      state.ownedItems.push({
        instanceId: `inst-${id}-${Date.now()}`,
        itemId: id,
        location: 'house_storage',
        quantity: 1,
      })
      state.money -= price
      if (type === 'weapon') state.stash.weapons.push(id)
      else state.stash.armors.push(id)
    }
  },

  removeFromStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
    const { type, id } = action.payload
    state.ownedItems = state.ownedItems.filter((o) => !(o.itemId === id && o.location === 'house_storage'))
    if (type === 'weapon') state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
    else state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
  },

  sellFromStash(state: GameState, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
    const { type, id } = action.payload
    const owned = state.ownedItems.find((o) => o.itemId === id && o.location === 'house_storage')
    if (!owned) return
    const sellPrice = type === 'weapon'
      ? Math.floor(getWeaponRepairCost(id) * 2.5)
      : Math.floor(getArmorRepairCost(id) * 2.5)
    if (type === 'weapon') {
      state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
    } else {
      state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
    }
    state.ownedItems = state.ownedItems.filter((o) => o !== owned)
    state.money += sellPrice
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-sell-${id}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'economy',
      message: `Sold ${type} from stash. +${sellPrice} Marks.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  moveItem(state: GameState, action: PayloadAction<{ instanceId: string; location: OwnedItemLocation }>) {
    const { instanceId, location } = action.payload
    const item = state.ownedItems.find((o) => o.instanceId === instanceId)
    if (item) item.location = location
  },

  sellItem(state: GameState, action: PayloadAction<{ instanceId: string }>) {
    const result = sellItemCommand(current(state) as GameState, action.payload.instanceId)
    Object.assign(state, result)
  },

  installModuleItem(state: GameState, action: PayloadAction<{ instanceId: string }>) {
    const result = installModuleCommand(current(state) as GameState, action.payload.instanceId)
    if (result.success) {
      Object.assign(state, result.state)
    }
  },

  searchRoom(state: GameState, action: PayloadAction<string>) {
    const snapshot = current(state) as GameState
    return searchHouseRoom(snapshot, action.payload)
  },

  useItem(
    state: GameState,
    action: PayloadAction<{
      instanceId: string
      action: 'equip' | 'consume' | 'install' | 'present' | 'archive'
      targetNpcId?: string
    }>,
  ) {
    const snapshot = current(state) as GameState
    return useItemCommand(snapshot, action.payload)
  },

  giveItemToNpc(state: GameState, action: PayloadAction<{ instanceId: string; npcId: string }>) {
    const snapshot = current(state) as GameState
    return giftItemToNpcCommand(snapshot, action.payload)
  },
}
