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
  npcType: 'roster',
  playerRosterMember: true,
  status: 'mercenary',
  assignment: 'idle',
  assignedDistrictId: null,
  worldDisposition: null,
  lastContactDay: null,
  locationOverride: null,
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
  dutyPostRoomId: null,
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
  equipment: { weapon: null, armor: null, accessory: [] },
  // inventory removed - NPCs use inventoryState.npcInventories
  personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
  clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
  armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
  arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
  npcMemory: [],
  bondStatus: null,
  npcArc: null,
  currentDirectiveId: null,
  directiveDeadlineDay: null,
  currentEmployment: null,
    currentIntention: null,
  factionRelationships: [],
  wardPersonalAllowance: { allowancePerWeek: 2, personalSavings: 0, lastAllowanceDay: null, allowedItems: [], restrictedItems: [] },
}

/**
 * Game state snapshot with Ida Rhys already hired — use for tests that need 2 roster members.
 *
 * Ida is inserted at index 1 (right after Marion at index 0), NOT appended at the end. Since
 * destiny-rama.8 folded the 3 world/story runtime entries (Dalen Morke, Tomas Rell, Catrin Hale)
 * into `initialGameStateSnapshot.npcRuntimeStates` too, appending Ida after them would silently
 * shift her to index 4 — breaking every test across the codebase that reads
 * `initialStateWithIda.npcRuntimeStates[1]` expecting Ida (a long-standing, widely-relied-on
 * convention predating the unify epic). Keeping her at a fixed index 1 preserves that convention
 * without touching every call site.
 */
export const initialStateWithIda: GameState = {
  ...initialGameStateSnapshot,
  npcRuntimeStates: [
    initialGameStateSnapshot.npcRuntimeStates[0]!,
    idaRhysRosterEntry,
    ...initialGameStateSnapshot.npcRuntimeStates.slice(1),
  ],
}

/**
 * A world-person runtime entry (npcType:'world', playerRosterMember:false) for tests that need pure
 * state-transition math and don't need a real content-catalog definition (unlike
 * createRuntimeStateFromDefinition, this never throws on an unknown/fixture-only npcId). Use for
 * World NPC coverage in applyStateDecay/applyNpcPairing/recovery-style tests
 * (destiny-rama.8 — world persons are full NpcRuntimeState entries now).
 */
export function worldNpcRuntimeEntry(npcId: string, overrides: Partial<NpcRuntimeState> = {}): NpcRuntimeState {
  return {
    ...idaRhysRosterEntry,
    npcId,
    name: npcId,
    npcType: 'world',
    playerRosterMember: false,
    worldDisposition: 'neutral',
    lastContactDay: null,
    locationOverride: null,
    flags: [],
    roomAssignment: null,
    dutyPostRoomId: null,
    npcArc: null,
    ...overrides,
  }
}
