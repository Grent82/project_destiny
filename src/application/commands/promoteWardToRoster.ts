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

// A ward raised in the house from child stage needs this many days before the loyalty bonus applies.
const RAISED_IN_HOUSE_DAYS = 800

export function promoteWardToRoster(
  state: GameState,
  wardId: string,
  wardName: string,
  apprenticeship: string | null,
): GameState {
  const ward = state.wards.find((w) => w.wardId === wardId)
  if (!ward || ward.stage !== 'young_adult') return state

  const renownSlots = getRenownLevel(state.playerCharacter.renown).rosterSlots
  const rosterCapacity = renownSlots + (state.house.rosterBonus ?? 0)
  if (state.roster.length >= rosterCapacity) {
    return appendActivityLogEntry(
      state,
      'system',
      `${wardName} cannot join the household — there is no room.`,
    )
  }

  const { rng, getSeed } = createRng(state.rngSeed)

  const parentNpcIds = ward.parentNpcIds.length > 0
    ? ward.parentNpcIds
    : ward.parentNpcId ? [ward.parentNpcId] : []

  const parentNpcs = state.roster.filter((n) => parentNpcIds.includes(n.npcId))
  const parentTraits = parentNpcs.map((n) => n.traits)
  const parentAttrs = parentNpcs.map((n) => n.attributes)

  const raisedInHouse = ward.birthDay !== null && (state.day - ward.birthDay) >= RAISED_IN_HOUSE_DAYS

  const traits = calculateInheritedTraits(parentTraits, apprenticeship, raisedInHouse, rng)
  const attributes = calculateInheritedAttributes(parentAttrs, rng)
  const skills = buildInheritedSkills(apprenticeship)

  const npcId = ward.promotedToNpcId ?? `npc-ward-grown-${ward.wardId}`

  const newNpc: NpcRuntimeState = {
    npcId,
    name: wardName,
    status: 'ward',
    assignment: 'idle',
    assignedDistrictId: null,
    activeTitle: null,
    wagesOwedDays: 0,
    trainingFocus: null,
    attributes,
    skills: skills as NpcRuntimeState['skills'],
    traits,
    states: {
      health: 80,
      fatigue: 10,
      stress: 15,
      morale: 65,
      fear: 5,
      anger: 5,
      hunger: 10,
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
    npcMemory: [],
    bondStatus: null,
    npcArc: null,
  }

  const next: GameState = {
    ...state,
    wards: state.wards.filter((w) => w.wardId !== wardId),
    roster: [...state.roster, newNpc],
    rngSeed: getSeed(),
  }

  return appendActivityLogEntry(
    next,
    'system',
    `${wardName} joins the roster — no longer a ward, but a name of their own.`,
  )
}
