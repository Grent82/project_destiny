import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import {
  calculateInheritedTraits,
  calculateInheritedAttributes,
  buildInheritedSkills,
} from '../../domain/npc/traitInheritance'
import { getRenownLevel } from '../../domain/progression/contracts'
import { createRng } from './seededRng'
import { appendActivityLogEntry } from './activityLog'

/**
 * Formalize an adult heir as a roster NPC, applying trait inheritance from parentRefs.
 * Removes the heir from houseHeirs and adds a new NpcRuntimeState.
 * The heir must be at 'adult' stage. Returns state unchanged otherwise.
 */
export function formalizeHeir(
  state: GameState,
  heirId: string,
  apprenticeship: string | null = null,
): GameState {
  const heir = state.house.houseHeirs.find((h) => h.id === heirId)
  if (!heir || heir.stage !== 'adult') return state

  const renownSlots = getRenownLevel(state.playerCharacter.renown).rosterSlots
  const rosterCapacity = renownSlots + (state.house.rosterBonus ?? 0)
  if (state.roster.length >= rosterCapacity) {
    return appendActivityLogEntry(
      state,
      'system',
      `${heir.name} cannot join the household — there is no room.`,
    )
  }

  const { rng, getSeed } = createRng(state.rngSeed)

  const parentRefs = heir.parentRefs ?? []
  const parentNpcs = state.roster.filter((n) => parentRefs.includes(n.npcId))
  const parentTraits = parentNpcs.map((n) => n.traits)
  const parentAttrs = parentNpcs.map((n) => n.attributes)

  const raisedInHouse = heir.arrivalDay !== undefined && (state.day - heir.arrivalDay) >= 800

  const traits = calculateInheritedTraits(parentTraits, apprenticeship, raisedInHouse, rng)
  const attributes = calculateInheritedAttributes(parentAttrs, rng)
  const skills = buildInheritedSkills(apprenticeship)

  const newNpc: NpcRuntimeState = {
    npcId: heirId,
    name: heir.name,
    status: 'family',
    assignment: 'idle',
    assignedDistrictId: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    roomAssignment: null,
    attributes,
    skills: skills as NpcRuntimeState['skills'],
    traits,
    states: {
      health: 85,
      fatigue: 5,
      stress: 10,
      morale: 70,
      fear: 3,
      anger: 3,
      hunger: 10,
      injury: 0,
      intoxication: 0,
      hygiene: 75,
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
    bondStatus: null,
    npcArc: null,
    currentDirectiveId: null,
    directiveDeadlineDay: null,
    currentIntention: null,
    factionRelationships: [],
  }

  const next: GameState = {
    ...state,
    house: {
      ...state.house,
      houseHeirs: state.house.houseHeirs.filter((h) => h.id !== heirId),
    },
    roster: [...state.roster, newNpc],
    rngSeed: getSeed(),
  }

  return appendActivityLogEntry(
    next,
    'system',
    `${heir.name} joins the household as an adult member of House Valdris.`,
  )
}
