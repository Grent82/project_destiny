/**
 * Test fixtures for game state scenarios.
 * Use these when a test needs NPCs beyond Marion Vale (the Day 1 starting roster).
 */
import { type GameState, type NpcRuntimeState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { calculateMercenaryContractWage } from './wageRates'
import { NPC_IDS } from '../content/ids'

/** Ida Rhys roster entry — represents her after the player hires her (she starts in the hire pool) */
export const idaRhysRosterEntry: NpcRuntimeState = {
  npcId: NPC_IDS.IDA_RHYS,
  name: 'Ida Rhys',
  status: 'mercenary',
  assignment: 'idle',
  assignedDistrictId: null,
  activeTitle: null,
  wagesOwedDays: 0,
  contractWagePerDay: calculateMercenaryContractWage({
    melee: 39,
    ranged: 33,
    medicine: 12,
    administration: 18,
    engineering: 73,
    negotiation: 16,
    survival: 28,
    security: 31,
    crafting: 69,
    performance: 6,
    academics: 22,
    intrigue: 11,
  }),
  trainingFocus: null,
  roomAssignment: null,
  attributes: {
    might: 54,
    agility: 42,
    endurance: 59,
    intellect: 57,
    perception: 49,
    presence: 35,
    resolve: 64,
  },
  skills: {
    melee: 39,
    ranged: 33,
    medicine: 12,
    administration: 18,
    engineering: 73,
    negotiation: 16,
    survival: 28,
    security: 31,
    crafting: 69,
    performance: 6,
    academics: 22,
    intrigue: 11,
  },
  traits: {
    discipline: 74,
    ambition: 48,
    empathy: 29,
    ruthlessness: 38,
    prudence: 59,
    curiosity: 64,
    dominance: 27,
    loyalty: 46,
    vanity: 8,
    zeal: 35,
  },
  states: {
    health: 91,
    fatigue: 16,
    stress: 18,
    morale: 61,
    fear: 9,
    anger: 14,
    hunger: 20,
    injury: 4,
    intoxication: 0,
    hygiene: 68,
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
  currentDirectiveId: null,
  directiveDeadlineDay: null,
  factionRelationships: [],
}

/** Game state snapshot with Ida Rhys already hired — use for tests that need 2 roster members */
export const initialStateWithIda: GameState = {
  ...initialGameStateSnapshot,
  roster: [...initialGameStateSnapshot.roster, idaRhysRosterEntry],
}
