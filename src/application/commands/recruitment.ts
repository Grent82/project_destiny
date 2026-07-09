import type { GameState } from '../../domain'
import { selectRosterNpcs } from './npcPopulation'
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
import { resolveStartingArmorItemId, registerStartingArmorInstance, startingArmorInstanceId as startingArmorInstanceIdFor } from './npcInventoryHelpers'

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
  bondStatus: GameState['npcRuntimeStates'][number]['bondStatus'],
) {
  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef) return null

  const initialLoyalty = Math.max(0, (npcDef.startingTraits.loyalty ?? 50) - initialLoyaltyPenalty)

  // Get an existing non-roster runtime entry if one exists - preserve clothing, armor, health,
  // injury, and memory (destiny-rama.8: world/story persons now live in the same npcRuntimeStates
  // list). Recruiting such a person upserts this entry in place (destiny-rama.17) rather than
  // discarding their accumulated state.
  const worldNpcState = state.npcRuntimeStates.find((w) => w.npcId === npcId && !w.playerRosterMember)

  // Priority: existing world-person state > startingEquipment from definition > defaults
  const clothing = worldNpcState?.clothing
    ?? npcDef.startingEquipment?.clothing
    ?? { head: null, torso: 'cloth-tunic-simple', arms: null, legs: 'cloth-trousers-burlap', feet: 'cloth-boots-work', full: null, undergarments: 'cloth-underclothes-simple', accessories: [] }
  const armor = worldNpcState?.armor
    ?? npcDef.startingEquipment?.armor
    ?? { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null }

  const startingArmorId = resolveStartingArmorItemId(armor, clothing)
  const startingArmorInstanceId = startingArmorId ? startingArmorInstanceIdFor(npcId) : null

  return {
    npcId,
    name: npcDef.name,
    // Content kind from the definition; recruiting does not change what KIND of person they are.
    npcType: npcDef.npcType,
    // Recruiting is exactly what makes someone a player-roster member (the sole discriminator now
    // that persons no longer live in a separate `roster` array). See unified-npc-runtime-contract §2.1.
    playerRosterMember: true,
    status: npcDef.status,
    assignment: 'idle' as const,
    assignedDistrictId: null,
    // World-ambient fields do not apply to a player-roster member.
    worldDisposition: null,
    lastContactDay: null,
    locationOverride: null,
    activeTitle: null,
    wagesOwedDays: 0,
    contractWagePerDay: wagePerDay,
    trainingFocus: null,
    roomAssignment: null,
    dutyPostRoomId: null,
    clothing,
    armor,
    attributes: { ...npcDef.baseAttributes },
    skills: { ...npcDef.startingSkills },
    traits: { ...npcDef.startingTraits, loyalty: initialLoyalty },
    states: {
      health: worldNpcState?.states.health ?? 100,
      fatigue: 0,
      stress: 0,
      morale: 50,
      fear: 0,
      anger: 0,
      hunger: 0,
      injury: worldNpcState?.states.injury ?? 0,
      intoxication: 0,
      hygiene: 70,
    },
    loadout: {
      primaryWeaponId: null,
      secondaryWeaponId: null,
      // startingArmorId, resolved just above from `armor`/`clothing` (the "existing world-state >
      // startingEquipment > defaults" values), was previously discarded here -- computed correctly,
      // then hardcoded to null on write. combat.ts/combatants.ts and the roster UI's Arms & Armor
      // panel read loadout.armorId, not the granular armor{}/clothing{} fields above (which have no
      // reader anywhere), so every recruited NPC always appeared and fought completely unarmored
      // regardless of what content authors specified in startingEquipment.
      armorId: startingArmorId,
      accessoryIds: [],
      consumableIds: [],
    },
    // startingArmorInstanceId backs armorId with a real, registered item instance (registered by
    // recruitNpc/acquireBoundHireOffer below, which have state.inventoryState access this builder
    // doesn't) so Unequip finds and returns a real item instead of silently no-op'ing on a bare id.
    equipment: { weapon: null, armor: startingArmorInstanceId, accessory: [] },
    personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
    arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
    npcMemory: worldNpcState?.npcMemory ?? [],
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
    currentEmployment: null,
    currentIntention: null,
    factionRelationships: [],
    wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
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

  const existingEntry = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (existingEntry?.playerRosterMember) return state

  const renownLevel = getRenownLevel(state.playerCharacter.renown)
  if (selectRosterNpcs(state).length >= renownLevel.rosterSlots) return state

  const newRosterEntry = buildRosterEntryFromOffer(state, npcId, offer.wagePerDay, 20, null)
  if (!newRosterEntry) return state

  // Upsert: if a non-roster (world/story) entry already exists for this person, flip them onto the
  // roster in place instead of appending a duplicate (destiny-rama.17).
  const npcRuntimeStates = existingEntry
    ? state.npcRuntimeStates.map((r) => (r.npcId === npcId ? newRosterEntry : r))
    : [...state.npcRuntimeStates, newRosterEntry]

  let next: GameState = {
    ...state,
    money: state.money - offer.signingBonus,
    npcRuntimeStates,
    availableForHire: state.availableForHire.filter((o) => o.npcId !== npcId),
  }

  // Register a real itemRegistry entry backing newRosterEntry.equipment.armor, so it behaves like
  // any other equipped item (Unequip finds it) rather than a bare loadout.armorId with nothing
  // behind it. Idempotent -- no-ops if this npcId's starting-armor instance is already registered.
  next = registerStartingArmorInstance(next, npcId, newRosterEntry.loadout.armorId)

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

  const existingEntry = state.npcRuntimeStates.find((entry) => entry.npcId === npcId)
  if (existingEntry?.playerRosterMember) return state

  const renownLevel = getRenownLevel(state.playerCharacter.renown)
  if (selectRosterNpcs(state).length >= renownLevel.rosterSlots) return state

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

  // Upsert: if a non-roster (world/story) entry already exists for this person, flip them onto the
  // roster in place instead of appending a duplicate (destiny-rama.17).
  const npcRuntimeStates = existingEntry
    ? state.npcRuntimeStates.map((entry) => (entry.npcId === npcId ? newRosterEntry : entry))
    : [...state.npcRuntimeStates, newRosterEntry]

  let next: GameState = {
    ...state,
    money: state.money - terms.intakeFee,
    npcRuntimeStates,
    availableForHire: state.availableForHire.filter((entry) => entry.npcId !== npcId),
  }

  next = registerStartingArmorInstance(next, npcId, newRosterEntry.loadout.armorId)

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
  const entry = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (!entry) return state

  const npcDef = contentCatalog.npcsById.get(npcId)
  const name = npcDef?.name ?? entry.name

  // Write loss memories on related NPCs (pass state before NPC removal so roster still has them)
  let next = writeLossMemories(state, npcId, state.day)

  // Now remove the NPC from roster, squad, and any group they led/belonged to (destiny-nid0:
  // dismissing a group leader disbands the group; dismissing a member just drops their slot).
  next = {
    ...next,
    npcRuntimeStates: next.npcRuntimeStates.filter((r) => r.npcId !== npcId),
    selectedSquadNpcIds: next.selectedSquadNpcIds.filter((id) => id !== npcId),
    npcGroups: next.npcGroups
      .filter((g) => g.leaderId !== npcId)
      .map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== npcId) })),
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
