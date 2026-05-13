import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { getRenownLevel } from '../../domain/progression/contracts'

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

  const initialLoyalty = Math.max(0, (npcDef.startingTraits.loyalty ?? 50) - 20)

  const newRosterEntry = {
    npcId,
    name: npcDef.name,
    status: npcDef.status,
    assignment: 'idle' as const,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
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
    relationships: {},
  }

  let next: GameState = {
    ...state,
    money: state.money - offer.signingBonus,
    roster: [...state.roster, newRosterEntry],
    availableForHire: state.availableForHire.filter((o) => o.npcId !== npcId),
  }

  const bonusNote =
    offer.signingBonus > 0 ? ` Signing cost: ${offer.signingBonus} Marks.` : ''
  next = appendActivityLogEntry(
    next,
    'economy',
    `${npcDef.name} takes on work with the house.${bonusNote}`,
  )

  return next
}

export function dismissNpc(state: GameState, npcId: string): GameState {
  const entry = state.roster.find((r) => r.npcId === npcId)
  if (!entry) return state

  const npcDef = contentCatalog.npcsById.get(npcId)
  const name = npcDef?.name ?? entry.name

  let next: GameState = {
    ...state,
    roster: state.roster.filter((r) => r.npcId !== npcId),
    selectedSquadNpcIds: state.selectedSquadNpcIds.filter((id) => id !== npcId),
  }

  next = appendActivityLogEntry(
    next,
    'system',
    `${name} leaves the house. An arrangement ends.`,
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
