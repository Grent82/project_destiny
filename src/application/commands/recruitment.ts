import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { formatMarks } from '../../domain/game/currency'
import { getRenownLevel } from '../../domain/progression/contracts'
import { writeLossMemories } from './grief'
import { initializeRosterRelationships } from './initializeRosterRelationships'
import { createRng } from './seededRng'
import { publishEvent } from './events/publishEvent'
import npcArcsData from '../../../data/definitions/npc-arcs.json'
import { npcArcDefinitionSchema } from '../../domain/npc/contracts'

const npcArcDefs = npcArcDefinitionSchema.array().parse(npcArcsData)
const npcArcDefsById = new Map(npcArcDefs.map((a) => [a.arcId, a]))

const DEFAULT_BOUND_TERM_DAYS = 30

export interface DerivedBondTerms {
  intakeFee: number
  contractValue: number
  termDays: number
  marketValue: number
}

export function deriveBondTermsFromHireOffer(
  offer: Pick<GameState['availableForHire'][number], 'wagePerDay' | 'signingBonus'>,
): DerivedBondTerms {
  const intakeFee = Math.max(5, Math.ceil(offer.signingBonus * 0.5))
  const contractValue = Math.max(offer.signingBonus, offer.wagePerDay * 12)
  const marketValue = Math.max(contractValue, Math.ceil(contractValue * 1.2))

  return {
    intakeFee,
    contractValue,
    termDays: DEFAULT_BOUND_TERM_DAYS,
    marketValue,
  }
}

function buildRosterEntryFromOffer(
  state: GameState,
  npcId: string,
  wagePerDay: number,
  initialLoyaltyPenalty: number,
  bondStatus: GameState['roster'][number]['bondStatus'],
) {
  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef) return null

  const initialLoyalty = Math.max(0, (npcDef.startingTraits.loyalty ?? 50) - initialLoyaltyPenalty)

  return {
    npcId,
    name: npcDef.name,
    status: npcDef.status,
    assignment: 'idle' as const,
    assignedDistrictId: null,
    activeTitle: null,
    wagesOwedDays: 0,
    contractWagePerDay: wagePerDay,
    trainingFocus: null,
    roomAssignment: null,
    attributes: { ...npcDef.baseAttributes },
    skills: { ...npcDef.startingSkills },
    traits: { ...npcDef.startingTraits, loyalty: initialLoyalty },
    states: {
      health: 100,
      fatigue: 0,
      stress: 0,
      morale: 50,
      fear: 0,
      anger: 0,
      hunger: 0,
      injury: 0,
      intoxication: 0,
      hygiene: 70,
    },
    loadout: {
      primaryWeaponId: null,
      secondaryWeaponId: null,
      armorId: null,
      accessoryIds: [],
      consumableIds: [],
    },
    equipment: { weapon: null, armor: null, accessory: [] },
    inventory: [],
    npcMemory: [],
    bondStatus,
    npcArc: npcDef.defaultArcId
      ? (() => {
          const arcDef = npcArcDefsById.get(npcDef.defaultArcId!)
          if (!arcDef || arcDef.stages.length === 0) return null
          return { arcId: npcDef.defaultArcId!, stage: arcDef.stages[0]!.id, stageEnteredDay: state.day, stageFlags: {}, driftHistory: [] }
        })()
      : null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
  }
}

export function recruitNpc(state: GameState, npcId: string): GameState {
  const offer = state.availableForHire.find((o) => o.npcId === npcId)
  if (!offer) return state

  if (offer.signingBonus > state.money) return state

  // Gate: player must meet the required faction standing to hire this NPC
  if (offer.requiredFactionId) {
    const standing = state.factionStandings[offer.requiredFactionId] ?? -100
    if (standing < offer.requiredFactionStanding) return state
  }

  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef) return state

  const alreadyOnRoster = state.roster.some((r) => r.npcId === npcId)
  if (alreadyOnRoster) return state

  const renownLevel = getRenownLevel(state.playerCharacter.renown)
  if (state.roster.length >= renownLevel.rosterSlots) return state

  const newRosterEntry = buildRosterEntryFromOffer(state, npcId, offer.wagePerDay, 20, null)
  if (!newRosterEntry) return state

  let next: GameState = {
    ...state,
    money: state.money - offer.signingBonus,
    roster: [...state.roster, newRosterEntry],
    availableForHire: state.availableForHire.filter((o) => o.npcId !== npcId),
  }

  // Seed Tier 1 authored bonds and compatibility-derived edges for new NPC vs existing roster
  const { rng } = createRng(state.rngSeed)
  next = initializeRosterRelationships(next, rng)

  const bonusNote =
    offer.signingBonus > 0 ? ` Signing cost: ${formatMarks(offer.signingBonus)}.` : ''
  next = appendActivityLogEntry(
    next,
    'economy',
    `${npcDef.name} takes on work with the house.${bonusNote}`,
  )

  // Publish world event for NPC hiring
  next = publishEvent(
    next,
    'npc-hired',
    { npcId, npcName: npcDef.name, wagePerDay: offer.wagePerDay, source: offer.source ?? 'district' },
    'player',
    { sourceNpcId: npcId, activityLogMessage: undefined } // Already logged above
  )

  return next
}

export function acquireBoundHireOffer(state: GameState, npcId: string): GameState {
  const offer = state.availableForHire.find((entry) => entry.npcId === npcId)
  if (!offer) return state

  if (offer.requiredFactionId) {
    const standing = state.factionStandings[offer.requiredFactionId] ?? -100
    if (standing < offer.requiredFactionStanding) return state
  }

  const alreadyOnRoster = state.roster.some((entry) => entry.npcId === npcId)
  if (alreadyOnRoster) return state

  const renownLevel = getRenownLevel(state.playerCharacter.renown)
  if (state.roster.length >= renownLevel.rosterSlots) return state

  const terms = deriveBondTermsFromHireOffer(offer)
  if (state.money < terms.intakeFee) return state

  const newRosterEntry = buildRosterEntryFromOffer(
    state,
    npcId,
    offer.wagePerDay,
    30,
    {
      holderId: 'player',
      contractValue: terms.contractValue,
      termDays: terms.termDays,
      entryReason: 'debt-settlement',
      alongsideFreeAssignmentDays: 0,
      lastEqualityNoticeDay: null,
      forSale: false,
      lastOfferDay: null,
      marketValue: terms.marketValue,
      ownerType: 'player',
      bondStartDay: state.day,
    },
  )
  if (!newRosterEntry) return state

  let next: GameState = {
    ...state,
    money: state.money - terms.intakeFee,
    roster: [...state.roster, newRosterEntry],
    availableForHire: state.availableForHire.filter((entry) => entry.npcId !== npcId),
  }

  const { rng } = createRng(state.rngSeed)
  next = initializeRosterRelationships(next, rng)

  next = appendActivityLogEntry(
    next,
    'economy',
    `${newRosterEntry.name} enters the house under a debt contract. Intake cost: ${formatMarks(terms.intakeFee)}.`,
  )

  return next
}

export function dismissNpc(state: GameState, npcId: string): GameState {
  const entry = state.roster.find((r) => r.npcId === npcId)
  if (!entry) return state

  const npcDef = contentCatalog.npcsById.get(npcId)
  const name = npcDef?.name ?? entry.name

  // Write loss memories on related NPCs (pass state before NPC removal so roster still has them)
  let next = writeLossMemories(state, npcId, state.day)

  // Now remove the NPC from roster and squad
  next = {
    ...next,
    roster: next.roster.filter((r) => r.npcId !== npcId),
    selectedSquadNpcIds: next.selectedSquadNpcIds.filter((id) => id !== npcId),
  }

  next = appendActivityLogEntry(
    next,
    'system',
    `${name} leaves the house. An arrangement ends.`,
  )

  // Publish world event for NPC departure
  next = publishEvent(
    next,
    'npc-departed',
    { npcId, npcName: name, reason: 'dismissed' },
    'player',
    { sourceNpcId: npcId, activityLogMessage: undefined } // Already logged above
  )

  return next
}

export function expireHireOffers(state: GameState): GameState {
  return {
    ...state,
    availableForHire: state.availableForHire
      .map((o) => ({ ...o, turnsAvailable: o.turnsAvailable - 1 }))
      .filter((o) => o.turnsAvailable > 0),
  }
}
