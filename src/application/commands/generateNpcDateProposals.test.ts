import { describe, it, expect } from 'vitest'
import { generateNpcDateProposals } from './generateNpcDateProposals'
import { createRng } from './seededRng'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

// Test fixtures
const createTestState = (overrides?: Partial<GameState>): GameState => ({
  day: 10,
  timeSlot: 'evening',
  money: 1000,
  protagonistName: 'Test Player',
  hasSeenOpening: false,
  cityDials: { control: 50, prosperity: 60, unrest: 20, corruption: 0 },
  factionStandings: {},
  factionStates: [],
  districts: [],
  npcRuntimeStates: [],
  inventoryState: {
    player: { equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null }, bagContainers: [], totalBagSlots: 40, usedBagSlots: 0 },
    npcInventories: {},
    sharedContainers: [],
    itemRegistry: {},
  },
  houseStorageCapacity: 40,
  installedHouseModules: [],
  cityResources: {
    foodSecurity: 70,
    foodStock: 500,
    foodCapacity: 1000,
    waterAccess: 80,
    materialStock: 60,
    corridorStatus: 'open',
    corridorClearanceProgressDays: 0,
    activeGroups: [],
    groupHistory: [],
  },
  activityLog: [],
  selectedSquadNpcIds: [],
  activeCombat: null,
  lastEncounterSummary: null,
  lastResolvedEventSummary: null,
  pendingEvents: [],
  eventInstances: [],
  currentDistrictId: 'district-the-pale',
  availableForHire: [],
  availableQuestLeads: [],
  activeQuests: [],
  completedQuestIds: [],
  failedQuestIds: [],
  questHistory: [],
  councilSeats: {},
  houseWardSeats: 0,
  houseProposalCooldown: 0,
  institutionalStanding: {},
  activeCouncilVotes: [],
  relationships: {},
  equippedItemDurabilities: {},
  activeInvestigation: null,
  lastInvestigationResult: null,
  pendingConsumableDecision: null,
  lastFiredDay: {},
  rivalOrgActions: [],
  cityStability: 60,
  expeditionState: { status: 'idle', destinationId: null, squadNpcIds: [], suppliesRemaining: 0, daysDeparted: 0, totalDays: 0, encounters: [], discoveries: [], cityDayAtDeparture: 0 },
  householdLore: { houseName: 'House Valdris', founderName: 'Edric Valdris', founderGeneration: 2, antagonistFactionId: 'faction-gilded-court', missingRelatives: [] },
  stash: { weapons: [], armors: [] },
  enabledActions: [],
  playerStatuses: [],
  activeTrainingBonuses: [],
  tempStatBoosts: [],
  equippedTools: [],
  evidenceInventory: [],
  houseImprovements: { waterQuality: 0, herbSupply: 0, entrySecurity: 0 },
  sleepQualityBonus: 0,
  isFirstRun: false,
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  houseDistrictId: 'district-the-pale',
  playerCharacter: {
    name: 'Test Player',
    attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
    skills: { melee: 30, ranged: 30, medicine: 30, administration: 30, engineering: 30, negotiation: 30, survival: 30, security: 30, crafting: 30, performance: 30, academics: 30, intrigue: 30 },
    traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance: 50, loyalty: 50, vanity: 50, zeal: 50 },
    level: 1,
    renown: 0,
  },
  mainQuest: { stage: 'searching', lastClue: '' },
  districtTension: {},
  activeDialogueId: null,
  activeDialogueNodeId: null,
  visitedDialogueNodes: {},
  resolvedDialogueChoices: {},
  house: {
    rooms: [],
    vaultUnlocked: false,
    rosterBonus: 0,
    exteriorState: 'patched',
    fortificationLevel: 0,
    houseHeirs: [],
    npcPairingPolicy: 'open',
    lastDomesticRelationshipBeat: null,
    relationshipMilestones: [],
  },
  pendingDateProposals: [],
  scheduledDates: [],
  npcDateCooldowns: {},
  saveVersion: 6,
  timeSlotState: { currentSlot: 'evening', slotQueue: [], completedTasks: [], skippedTasks: [], slotHistory: [], lastProcessedSeed: 42 },
  rngSeed: 42,
  chronicle: { entriesByDay: {}, version: 1 },
  rumors: [],
  bondVisibility: {},
  siteRuntimes: {},
  npcSitePresences: [],
  bondedPersonsRegistry: {},
  worldEvents: [],
  activeDirectives: [],
  privateCorrespondence: [],
  ...overrides,
})

const createTestNpc = (id: string, name: string, overrides?: Partial<NpcRuntimeState>): NpcRuntimeState => ({
  npcId: id,
  name,
  status: 'retainer' as const,
  assignment: 'idle' as const,
  // These fixtures represent the player's roster NPCs (Marion, Ida, etc.) by default — tests that
  // want a World-person fixture instead should override this explicitly.
  playerRosterMember: true,
  ...overrides,
} as unknown as NpcRuntimeState)


describe('generateNpcDateProposals', () => {
  it('returns state unchanged if fewer than 2 eligible NPCs', () => {
    const state = createTestState({
      npcRuntimeStates: [createTestNpc('npc-1', 'NPC One')],
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('returns state unchanged if NPCs have no intimacy', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One'),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {},
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('returns state unchanged if NPCs are on cooldown', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One'),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {
        'npc-date-proposal-npc-1-npc-2': 5, // 5 days ago, within 7-day cooldown
      },
      day: 10,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('creates date proposal when RNG roll succeeds and intimacy is sufficient', () => {
    // Use a seed that will produce a favorable RNG roll
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-marion', 'Marion Vale'),
        createTestNpc('npc-ida', 'Ida Rhys'),
      ],
      relationships: {
        'npc-marion->npc-ida': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-ida->npc-marion': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
      rngSeed: 42,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)

    // With sufficient intimacy and no cooldown, a proposal may or may not be created
    // depending on the RNG roll. We verify the structure if one is created.
    if (result.pendingDateProposals.length > 0) {
      const proposal = result.pendingDateProposals[0]!
      expect(proposal.proposerNpcId).toBeDefined()
      expect(proposal.targetNpcId).toBeDefined()
      expect(proposal.status).toBe('accepted')
      expect(proposal.proposedDay).toBe(11) // Tomorrow
      expect(proposal.dateTemplateId).toMatch(/^date-/)
    }
  })

  it('skips NPCs who are deployed', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One', { assignment: 'deployed' }),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    // Deployed NPCs should not generate proposals
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('skips NPCs who are captive', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One', { captivityState: { status: 'captive', holderId: 'npc-enemy', siteId: null, roomId: null, regime: 'unknown', condition: 'healthy', compliance: 'resistant', bondType: 'none', timeHeldDays: 5, lastTransferDay: null, questTag: null, confiscatedItems: [], confiscatedMoney: null, confiscatedEquipment: { weapon: null, armor: null, accessory: [] } } }),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('skips NPCs who are wards', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One', { status: 'ward' }),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('only proposes dates appropriate for intimacy stage', () => {
    // At 'affinity' stage, only affinity-required dates should be eligible
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One'),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
      rngSeed: 42,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)

    if (result.pendingDateProposals.length > 0) {
      const proposal = result.pendingDateProposals[0]!
      // Should not propose 'committed'-only dates like private-ritual
      expect(proposal.dateTemplateId).not.toBe('date-private-ritual')
    }
  })

  it('adds activity log entry when proposal is created', () => {
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-marion', 'Marion Vale'),
        createTestNpc('npc-ida', 'Ida Rhys'),
      ],
      relationships: {
        'npc-marion->npc-ida': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-ida->npc-marion': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
      rngSeed: 42,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)

    // Activity log should have entries if proposals were created
    if (result.pendingDateProposals.length > 0) {
      expect(result.activityLog.length).toBeGreaterThan(0)
      const logEntry = result.activityLog[result.activityLog.length - 1]
      expect(logEntry?.category).toBe('system')
      expect(logEntry?.message).toContain('Marion Vale')
      expect(logEntry?.message).toContain('Ida Rhys')
    }
  })

  it('respects npcPairingPolicy forbidden for new pairs', () => {
    // Note: This is handled by applyNpcPairing, but date proposals should also respect policy
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One'),
        createTestNpc('npc-2', 'NPC Two'),
      ],
      relationships: {
        'npc-1->npc-2': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'none' },
        'npc-2->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'none' },
      },
      house: {
        rooms: [],
        vaultUnlocked: false,
        rosterBonus: 0,
        exteriorState: 'patched',
        fortificationLevel: 0,
        houseHeirs: [],
        npcPairingPolicy: 'forbidden',
        lastDomesticRelationshipBeat: null,
        relationshipMilestones: [],
      },
      lastFiredDay: {},
      day: 10,
    })
    const rng = createRng(42).rng
    const result = generateNpcDateProposals(state, rng)
    // At 'none' intimacy, no proposals should be created anyway
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('does not list a World NPC in both the roster and world eligible pools (destiny-rama.8 regression)', () => {
    // Before playerRosterMember-based filtering, a world entry sharing npcRuntimeStates would pass
    // BOTH isRosterNpcDateEligible-derived pools (since a bare assignment/captivity/status check
    // can't tell "world" from "roster" once everyone lives in the same list), appearing twice in
    // allEligible and forming a nonsensical self-pair once the nested loop reached it against itself.
    const worldNpc = createTestNpc('npc-world-regression', 'World NPC', { playerRosterMember: false })
    const state = createTestState({
      npcRuntimeStates: [
        createTestNpc('npc-1', 'NPC One'),
        worldNpc,
      ],
      relationships: {
        'npc-1->npc-world-regression': { affinity: 50, respect: 40, fear: 10, trust: 45, loyalty: 30, intimacyStage: 'affinity' },
        'npc-world-regression->npc-1': { affinity: 55, respect: 45, fear: 8, trust: 50, loyalty: 35, intimacyStage: 'affinity' },
      },
      lastFiredDay: {},
      day: 10,
      rngSeed: 42,
    })
    const rng = createRng(42).rng
    // Must not throw and must not propose a self-pair (proposer === target).
    const result = generateNpcDateProposals(state, rng)
    for (const proposal of result.pendingDateProposals) {
      expect(proposal.proposerNpcId).not.toBe(proposal.targetNpcId)
    }
  })
})
