import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import type { HouseExteriorTier, NpcPairingPolicy } from '../../../domain/game/contracts'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../../content/equipmentCatalog'
import { computeRepairCost } from '../../commands/durability'
import { formatMarks } from '../../../domain/game/currency'
import { acceptWard as acceptWardCommand, formalizeAdultWard as formalizeAdultWardCommand, type WardOriginId } from '../../commands/houseWard'
import { setNpcPairingPolicy as setNpcPairingPolicyCommand } from '../../commands/setHousePolicy'
import { getRoomRepairDays } from '../../commands/houseRepairs'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

export const houseReducers = {
  repairItem(state: GameState, action: PayloadAction<{ npcId: string; slot: 'weapon' | 'armor' }>) {
    const { npcId, slot } = action.payload
    const npc = state.roster.find((r) => r.npcId === npcId)
    if (!npc) return

    const itemId = slot === 'weapon' ? npc.loadout.primaryWeaponId : npc.loadout.armorId
    if (!itemId) return

    const baseRepairCost = slot === 'weapon' ? getWeaponRepairCost(itemId) : getArmorRepairCost(itemId)
    const hasQuartermaster = state.roster.some((r) => r.activeTitle === 'title-quartermaster')
    const finalRepairCost = computeRepairCost(baseRepairCost, hasQuartermaster)
    if (state.money < finalRepairCost) return

    const durabilityMax = slot === 'weapon' ? getWeaponDurabilityMax(itemId) : getArmorDurabilityMax(itemId)
    state.money -= finalRepairCost
    if (!state.equippedItemDurabilities[npcId]) {
      state.equippedItemDurabilities[npcId] = {} as Record<'weapon' | 'armor', number>
    }
    state.equippedItemDurabilities[npcId]![slot] = durabilityMax

    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'economy',
      message: `Equipment repaired. Cost: ${formatMarks(finalRepairCost)}.${hasQuartermaster ? ' (Quartermaster discount applied)' : ''}`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  repairRoom(state: GameState, action: PayloadAction<string>) {
    const room = state.house.rooms.find((r) => r.roomId === action.payload)
    if (!room) return
    if (!['damaged', 'stripped', 'collapsed', 'destroyed'].includes(room.state)) return
    if (room.repairDaysRemaining > 0) return
    if (state.money < room.repairCost) return
    const repairDays = getRoomRepairDays(room)
    if (repairDays <= 0) return
    state.money -= room.repairCost
    room.repairDaysRemaining = repairDays
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-repair-start-${room.roomId}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'economy',
      message: `${room.name} repair crews are engaged. ${repairDays} day${repairDays !== 1 ? 's' : ''} of work remain.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  unlockVault(state: GameState) {
    state.house.vaultUnlocked = true
    const vault = state.house.rooms.find((r) => r.roomId === 'room-vault')
    if (vault) vault.state = 'intact'
  },

  advanceExteriorState(state: GameState, action: PayloadAction<{ targetTier: HouseExteriorTier }>) {
    const TIERS: HouseExteriorTier[] = ['ruined', 'patched', 'maintained', 'restored', 'grand']
    const currentIdx = TIERS.indexOf(state.house.exteriorState)
    const targetIdx = TIERS.indexOf(action.payload.targetTier)
    if (targetIdx > currentIdx) {
      state.house.exteriorState = action.payload.targetTier
    }
  },

  upgradeFortification(state: GameState, action: PayloadAction<{ cost: number }>) {
    if (state.house.fortificationLevel >= 5) return
    if (state.money < action.payload.cost) return
    state.money -= action.payload.cost
    state.house.fortificationLevel = Math.min(5, state.house.fortificationLevel + 1)
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-fortify`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `Fortification improved. Level: ${state.house.fortificationLevel}.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  resolveRaid(
    state: GameState,
    action: PayloadAction<{
      raidStrength: number
      raidType: 'faction_enforcement' | 'criminal' | 'the_remainder'
    }>,
  ) {
    const { raidStrength, raidType } = action.payload
    const snap = current(state) as GameState

    const fortScore = snap.house.fortificationLevel * 15
    const guardCount = snap.roster.filter((n) => n.assignment === 'defense').length
    const crewScore = guardCount * 10
    const tierScore: Record<string, number> = {
      ruined: 0, patched: 10, maintained: 25, restored: 50, grand: 80,
    }
    const renownLevel = Math.floor((tierScore[snap.house.exteriorState] ?? 0) / 20)
    const defenseRating = fortScore + crewScore + renownLevel * 5
    const repelled = defenseRating > raidStrength

    if (repelled) {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-raid-repelled`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: raidType === 'faction_enforcement'
          ? "The notary's agents withdraw. Your defenses held long enough for them to doubt the warrant."
          : raidType === 'criminal'
            ? 'The opportunists find the house better defended than expected. They fall back.'
            : 'The Remainder retreats, for now. It does not forget.',
      })
    } else {
      if (raidType === 'faction_enforcement') {
        const loss = Math.floor(raidStrength * 5)
        state.money = Math.max(0, state.money - loss)
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-raid-legal`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `The notary's agents seized ledgers and ${loss} Marks in assessed penalties. Legitimacy costs.`,
        })
      } else if (raidType === 'criminal') {
        const stolen = Math.floor(raidStrength * 3)
        state.money = Math.max(0, state.money - stolen)
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-raid-theft`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `Night thieves emptied what they could find. ${stolen} Marks lost.`,
        })
      } else {
        state.roster.forEach((npc) => {
          npc.states.morale = Math.max(0, npc.states.morale - 15)
          npc.states.stress = Math.min(100, npc.states.stress + 20)
        })
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-raid-remainder`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: 'Something moved through the house last night. No one speaks of it. Everyone felt it.',
        })
      }
    }
  },

  acceptWard(
    state: GameState,
    action: PayloadAction<{ wardId: string; wardName: string; originId: WardOriginId }>,
  ) {
    const { wardId, wardName, originId } = action.payload
    const snapshot = current(state) as GameState
    return acceptWardCommand(snapshot, wardId, wardName, originId)
  },

  formalizeAdultWard(
    state: GameState,
    action: PayloadAction<{ wardId: string } & Parameters<typeof formalizeAdultWardCommand>[2]>,
  ) {
    const { wardId, ...baseNpc } = action.payload
    return formalizeAdultWardCommand(current(state) as GameState, wardId, baseNpc)
  },

  setNpcPairingPolicy(state: GameState, action: PayloadAction<NpcPairingPolicy>) {
    return setNpcPairingPolicyCommand(current(state) as GameState, action.payload)
  },
}
