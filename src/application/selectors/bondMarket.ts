import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { BondEntryReason, BondStatus } from '../../domain/npc/contracts'
import { BOUND_KITCHEN_HAND_YIELD } from '../commands/foodFlow'
import { deriveBondTermsFromHireOffer } from '../commands/recruitment'

const selectGame = (state: RootState) => state.game
const COERCIVE_ENTRY_REASONS = new Set<BondEntryReason>([
  'compact-assessment',
  'combat-capture',
  'debt-settlement',
])
const EQUALITY_NOTICE_THRESHOLD_DAYS = 14
const HOLDER_MORAL_THRESHOLD_COUNT = 3
const MONTHLY_BOND_OPERATION_INTERVAL_DAYS = 28

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
  canAffordRelease: boolean
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
  conditionLabel: string
  saleQuotes: BrokerageSaleQuote[]
}

export interface BrokerageTransferredEntry {
  npcId: string
  name: string
  holderName: string
  holderNote: string
  entryReasonLabel: string
  marketValue: number
  ransomCost: number
  conditionLabel: string
  conditionTrendLabel: string
  legalRescueLabel: string
  canAffordLegalRescue: boolean
  legalRescueBlockedReason: string | null
  extractionLabel: string
  forceLabel: string
}

export interface BrokerageIntakeEntry {
  npcId: string
  name: string
  wagePerDay: number
  signingBonus: number
  intakeFee: number
  canAffordIntake: boolean
  intakeBlockedReason: string | null
  contractValue: number
  termDays: number
  marketValue: number
  background: string
}

export interface BrokerageSaleQuote {
  buyerId: string
  buyerName: string
  offerAmount: number
  note: string
}

function describeBuyerSpecialization(specialization: string): string {
  switch (specialization) {
    case 'assessed':
      return 'Registrar placement - slow, legal, and watched.'
    case 'specialist':
      return 'Noble placement - highest price, cleaner conditions.'
    case 'security':
      return 'Ring holding - harsher security and faster decline.'
    case 'labor':
    default:
      return 'Merchant placement - steady labor extraction.'
  }
}

function describeHealthBand(health: number): string {
  if (health >= 85) return 'stable'
  if (health >= 70) return 'worn'
  if (health >= 50) return 'strained'
  if (health >= 30) return 'hurt'
  return 'broken'
}

function describeConditionLabel(health: number): string {
  return `Condition: ${describeHealthBand(health)} (${health} health).`
}

function describeHoldingDrift(specialization: string): string {
  switch (specialization) {
    case 'specialist':
      return 'Daily drift: +1 health under this holding.'
    case 'security':
      return 'Daily drift: -2 health under this holding.'
    case 'assessed':
    case 'labor':
    default:
      return 'Daily drift: -1 health under this holding.'
  }
}

export interface BrokerageRiskOverview {
  coerciveHoldCount: number
  workingBoundCount: number
  freeWorkerCount: number
  empathicWitnessCount: number
  monthlyCostsActive: boolean
  monthlyCostsEveryDays: number
  equalityNoticeDaysRemaining: number | null
  heavyHoldThreshold: number
  heavyHoldActive: boolean
}

export function describeNpcBondSurface(bondStatus: BondStatus | null, playerMoney: number = 0): NpcBondSurface {
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
      canAffordRelease: true,
      rosterSummary: null,
      rosterBadges: [],
    }
  }

  const holderName = getHolderName(bondStatus)
  const entryReasonLabel = formatBondEntryReason(bondStatus.entryReason)

  if (bondStatus.ownerType === 'player') {
    const canAfford = playerMoney >= (bondStatus.contractValue ?? 0)
    return {
      status: 'player-held',
      holderName,
      entryReasonLabel,
      contractValue: bondStatus.contractValue,
      termDays: bondStatus.termDays,
      marketValue: bondStatus.marketValue,
      forSale: bondStatus.forSale,
      ransomCost: null,
      canAffordRelease: canAfford,
      rosterSummary: 'Bound to the house',
      rosterBadges: bondStatus.forSale ? ['Marked for transfer'] : [],
    }
  }

  const ransomCost = Math.ceil(bondStatus.marketValue * 1.5)
  const canAfford = playerMoney >= ransomCost
  return {
    status: 'npc-held',
    holderName,
    entryReasonLabel,
    contractValue: bondStatus.contractValue,
    termDays: bondStatus.termDays,
    marketValue: bondStatus.marketValue,
    forSale: false,
    ransomCost,
    canAffordRelease: canAfford,
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
          npc.assignment === 'working' && npc.dutyPostRoomId === 'room-kitchen',
        conditionLabel: describeConditionLabel(npc.states.health),
        saleQuotes: npc.bondStatus!.forSale
          ? contentCatalog.bondBuyers.map((buyer) => ({
              buyerId: buyer.id,
              buyerName: buyer.name,
              offerAmount: Math.round(npc.bondStatus!.marketValue * buyer.offerModifier),
              note: describeBuyerSpecialization(buyer.specialization),
            }))
          : [],
      }))

    const transferred: BrokerageTransferredEntry[] = game.roster
      .filter((npc) => npc.assignment === 'transferred' && npc.bondStatus?.ownerType === 'npc')
      .map((npc) => {
        const buyer = contentCatalog.bondBuyersById.get(npc.bondStatus!.holderId)
        const ransomCost = Math.ceil(npc.bondStatus!.marketValue * 1.5)
        const holderName = getHolderName(npc.bondStatus!)

        return {
          npcId: npc.npcId,
          name: npc.name,
          holderName,
          holderNote: buyer
            ? describeBuyerSpecialization(buyer.specialization).replace(/^([A-Z][^-]+) placement/, '$1 holding')
            : 'Current holder is not fully known.',
          entryReasonLabel: formatBondEntryReason(npc.bondStatus!.entryReason),
          marketValue: npc.bondStatus!.marketValue,
          ransomCost,
          conditionLabel: describeConditionLabel(npc.states.health),
          conditionTrendLabel: describeHoldingDrift(buyer?.specialization ?? 'labor'),
          legalRescueLabel: `Buy freedom (${ransomCost} Marks)`,
          canAffordLegalRescue: game.money >= ransomCost,
          legalRescueBlockedReason:
            game.money >= ransomCost ? null : `Need ${ransomCost - game.money} more Marks to meet the ${holderName} bid.`,
          extractionLabel: 'Extract quietly (health -20, Ring -15)',
          forceLabel: 'Seize by force (health -15)',
        }
      })

    const intake: BrokerageIntakeEntry[] = game.availableForHire
      .map((offer) => {
        const npc = contentCatalog.npcsById.get(offer.npcId)
        if (!npc) return null
        const terms = deriveBondTermsFromHireOffer(offer)
        return {
          npcId: offer.npcId,
          name: npc.name,
          wagePerDay: offer.wagePerDay,
          signingBonus: offer.signingBonus,
          intakeFee: terms.intakeFee,
          canAffordIntake: game.money >= terms.intakeFee,
          intakeBlockedReason:
            game.money >= terms.intakeFee
              ? null
              : `Need ${terms.intakeFee - game.money} more Marks to buy in this debt contract.`,
          contractValue: terms.contractValue,
          termDays: terms.termDays,
          marketValue: terms.marketValue,
          background: npc.background,
        }
      })
      .filter((entry): entry is BrokerageIntakeEntry => entry !== null)

    const boundKitchenHands = houseHeld.filter((entry) => entry.assignedToKitchen).length
    const workingBoundNpcs = game.roster.filter(
      (npc) =>
        npc.bondStatus?.ownerType === 'player' &&
        npc.bondStatus.holderId === 'player' &&
        npc.assignment === 'working',
    )
    const freeWorkers = game.roster.filter(
      (npc) => npc.assignment === 'working' && !(npc.bondStatus?.ownerType === 'player' && npc.bondStatus.holderId === 'player'),
    )
    const empathicWitnessCount = game.roster.filter((npc) => !npc.bondStatus && npc.traits.empathy > 55).length
    const equalityNoticeDaysRemaining =
      workingBoundNpcs.length > 0 && freeWorkers.length > 0
        ? Math.max(
            0,
            EQUALITY_NOTICE_THRESHOLD_DAYS -
              Math.max(
                ...workingBoundNpcs.map((npc) => npc.bondStatus?.alongsideFreeAssignmentDays ?? 0),
              ),
          )
        : null

    return {
      houseHeld,
      transferred,
      intake,
      kitchenIsIntact,
      hasBrokerageActivity: houseHeld.length + transferred.length + intake.length > 0,
      boundKitchenHands,
      boundKitchenOutput: boundKitchenHands * BOUND_KITCHEN_HAND_YIELD,
      risks: {
        coerciveHoldCount: game.roster.filter(
          (npc) =>
            npc.bondStatus?.ownerType === 'player' &&
            npc.bondStatus.holderId === 'player' &&
            COERCIVE_ENTRY_REASONS.has(npc.bondStatus.entryReason),
        ).length,
        workingBoundCount: workingBoundNpcs.length,
        freeWorkerCount: freeWorkers.length,
        empathicWitnessCount,
        monthlyCostsActive: workingBoundNpcs.length > 0,
        monthlyCostsEveryDays: MONTHLY_BOND_OPERATION_INTERVAL_DAYS,
        equalityNoticeDaysRemaining,
        heavyHoldThreshold: HOLDER_MORAL_THRESHOLD_COUNT,
        heavyHoldActive: houseHeld.length >= HOLDER_MORAL_THRESHOLD_COUNT,
      } satisfies BrokerageRiskOverview,
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
      [(root: RootState) => root.game.roster, (root: RootState) => root.game.money],
      (roster, money) => {
        const npc = roster.find((entry) => entry.npcId === npcId)
        return describeNpcBondSurface(npc?.bondStatus ?? null, money)
      },
    )
    npcBondSurfaceSelectorCache.set(npcId, selector)
  }
  return selector(state)
}

const npcBondSurfaceSelectorCache = new Map<string, (state: RootState) => NpcBondSurface>()
