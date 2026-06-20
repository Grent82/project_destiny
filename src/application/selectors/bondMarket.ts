import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { BondEntryReason, BondStatus } from '../../domain/npc/contracts'
import { BOUND_KITCHEN_HAND_YIELD } from '../commands/foodFlow'

const selectGame = (state: RootState) => state.game

const BOND_ENTRY_REASON_LABELS: Record<BondEntryReason, string> = {
  'compact-assessment': 'Compact assessment',
  'debt-settlement': 'Debt settlement',
  voluntary: 'Voluntary contract',
  'combat-capture': 'Combat capture',
  inherited: 'Inherited claim',
}

function formatBondEntryReason(entryReason: BondEntryReason): string {
  return BOND_ENTRY_REASON_LABELS[entryReason]
}

function getHolderName(bondStatus: BondStatus): string {
  if (bondStatus.ownerType === 'player' || bondStatus.holderId === 'player') {
    return 'House Valdris'
  }

  return contentCatalog.bondBuyersById.get(bondStatus.holderId)?.name ?? 'Unknown holder'
}

export interface NpcBondSurface {
  status: 'free' | 'player-held' | 'npc-held'
  holderName: string | null
  entryReasonLabel: string | null
  contractValue: number | null
  termDays: number | null
  marketValue: number | null
  forSale: boolean
  ransomCost: number | null
  rosterSummary: string | null
  rosterBadges: string[]
}

export interface BrokerageHouseHeldEntry {
  npcId: string
  name: string
  entryReasonLabel: string
  contractValue: number
  termDays: number | null
  marketValue: number
  forSale: boolean
  assignedToKitchen: boolean
}

export interface BrokerageTransferredEntry {
  npcId: string
  name: string
  holderName: string
  entryReasonLabel: string
  marketValue: number
  ransomCost: number
}

export function describeNpcBondSurface(bondStatus: BondStatus | null): NpcBondSurface {
  if (!bondStatus) {
    return {
      status: 'free',
      holderName: null,
      entryReasonLabel: null,
      contractValue: null,
      termDays: null,
      marketValue: null,
      forSale: false,
      ransomCost: null,
      rosterSummary: null,
      rosterBadges: [],
    }
  }

  const holderName = getHolderName(bondStatus)
  const entryReasonLabel = formatBondEntryReason(bondStatus.entryReason)

  if (bondStatus.ownerType === 'player') {
    return {
      status: 'player-held',
      holderName,
      entryReasonLabel,
      contractValue: bondStatus.contractValue,
      termDays: bondStatus.termDays,
      marketValue: bondStatus.marketValue,
      forSale: bondStatus.forSale,
      ransomCost: null,
      rosterSummary: 'Bound to the house',
      rosterBadges: bondStatus.forSale ? ['Marked for transfer'] : [],
    }
  }

  return {
    status: 'npc-held',
    holderName,
    entryReasonLabel,
    contractValue: bondStatus.contractValue,
    termDays: bondStatus.termDays,
    marketValue: bondStatus.marketValue,
    forSale: false,
    ransomCost: Math.ceil(bondStatus.marketValue * 1.5),
    rosterSummary: `Held by ${holderName}`,
    rosterBadges: [],
  }
}

export const selectBondedPersonsRegistry = createSelector(
  [selectGame],
  (game) => game.bondedPersonsRegistry ?? {},
)

export const selectNpcHeldBondedPersons = createSelector(
  [selectGame],
  (game) => {
    const registry = game.bondedPersonsRegistry ?? {}
    return game.roster
      .filter((npc) => npc.assignment === 'transferred' && npc.bondStatus?.ownerType === 'npc')
      .map((npc) => {
        const buyer = npc.bondStatus ? contentCatalog.bondBuyersById.get(npc.bondStatus.holderId) : undefined
        return {
          npc,
          buyerId: npc.bondStatus?.holderId ?? null,
          buyerName: buyer?.name ?? 'Unknown',
          registryEntry: Object.entries(registry).find(([, ids]) => ids.includes(npc.npcId)),
          ransomCost: Math.ceil((npc.bondStatus?.marketValue ?? 0) * 1.5),
        }
      })
  },
)

export const selectForSaleNpcs = createSelector(
  [selectGame],
  (game) =>
    game.roster.filter(
      (npc) => npc.bondStatus?.forSale === true && npc.bondStatus.ownerType === 'player',
    ),
)

export const selectBrokerageOverview = createSelector(
  [selectGame],
  (game) => {
    const kitchenIsIntact = game.house.rooms.some(
      (room) => room.roomId === 'room-kitchen' && room.state === 'intact',
    )

    const houseHeld: BrokerageHouseHeldEntry[] = game.roster
      .filter((npc) => npc.bondStatus?.ownerType === 'player' && npc.bondStatus.holderId === 'player')
      .map((npc) => ({
        npcId: npc.npcId,
        name: npc.name,
        entryReasonLabel: formatBondEntryReason(npc.bondStatus!.entryReason),
        contractValue: npc.bondStatus!.contractValue,
        termDays: npc.bondStatus!.termDays,
        marketValue: npc.bondStatus!.marketValue,
        forSale: npc.bondStatus!.forSale,
        assignedToKitchen:
          npc.assignment === 'working' && npc.roomAssignment === 'room-kitchen',
      }))

    const transferred: BrokerageTransferredEntry[] = game.roster
      .filter((npc) => npc.assignment === 'transferred' && npc.bondStatus?.ownerType === 'npc')
      .map((npc) => ({
        npcId: npc.npcId,
        name: npc.name,
        holderName: getHolderName(npc.bondStatus!),
        entryReasonLabel: formatBondEntryReason(npc.bondStatus!.entryReason),
        marketValue: npc.bondStatus!.marketValue,
        ransomCost: Math.ceil(npc.bondStatus!.marketValue * 1.5),
      }))

    const boundKitchenHands = houseHeld.filter((entry) => entry.assignedToKitchen).length

    return {
      houseHeld,
      transferred,
      kitchenIsIntact,
      hasBrokerageActivity: houseHeld.length + transferred.length > 0,
      boundKitchenHands,
      boundKitchenOutput: boundKitchenHands * BOUND_KITCHEN_HAND_YIELD,
      routes: {
        refusalRoute: game.currentDistrictId ? '/recruitment' : '/district-map',
        rosterRoute: '/roster',
      },
    }
  },
)

export function selectNpcBondSurface(state: RootState, npcId: string): NpcBondSurface {
  let selector = npcBondSurfaceSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector(
      [(root: RootState) => root.game.roster],
      (roster) => {
        const npc = roster.find((entry) => entry.npcId === npcId)
        return describeNpcBondSurface(npc?.bondStatus ?? null)
      },
    )
    npcBondSurfaceSelectorCache.set(npcId, selector)
  }
  return selector(state)
}

const npcBondSurfaceSelectorCache = new Map<string, (state: RootState) => NpcBondSurface>()
