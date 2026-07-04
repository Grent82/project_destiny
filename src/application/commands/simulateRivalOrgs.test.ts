import { describe, it, expect } from 'vitest'
import { simulateRivalOrgs, applyRivalActions } from './simulateRivalOrgs'
import type { GameState } from '../../domain/game/contracts'

const baseState: GameState = {
  day: 5,
  timeSlot: 'morning',
  money: 500,
  protagonistName: 'Test',
  hasSeenOpening: false,
  isFirstRun: false,
  cityDials: { control: 50, prosperity: 50, unrest: 30, corruption: 20 },
  factionStandings: {},
  factionStates: [],
  districts: [],
  npcRuntimeStates: [],
  houseStorageCapacity: 40,
  installedHouseModules: [],
  inventoryState: {
    player: {
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      bagContainers: [],
      totalBagSlots: 40,
      usedBagSlots: 0,
    },
    npcInventories: {},
    sharedContainers: [],
    itemRegistry: {},
  },
  cityResources: { foodSecurity: 60, foodStock: 600, foodCapacity: 1000, waterAccess: 60, materialStock: 60, corridorStatus: 'open', corridorClearanceProgressDays: 0, activeGroups: [], groupHistory: [] },
  activityLog: [],
  selectedSquadNpcIds: [],
  activeCombat: null,
  lastEncounterSummary: null,
  lastResolvedEventSummary: null,
  pendingEvents: [],
  currentDistrictId: null,
  availableForHire: [],
  availableQuestLeads: [],
  activeQuests: [],
  completedQuestIds: [],
  failedQuestIds: [],
  questHistory: [],
  councilSeats: {},
  institutionalStanding: {},
  activeCouncilVotes: [],
  relationships: {},
  equippedItemDurabilities: {},
  activeInvestigation: null,
  lastInvestigationResult: null,
  lastFiredDay: {},
  rivalOrgActions: [],
  cityStability: 60,
  expeditionState: {
    status: 'idle',
    destinationId: null,
    squadNpcIds: [],
    suppliesRemaining: 0,
    daysDeparted: 0,
    totalDays: 0,
    encounters: [],
    discoveries: [],
    cityDayAtDeparture: 0,
  },
  householdLore: {
    houseName: 'House Test',
    founderName: 'Test Founder',
    founderGeneration: 1,
    antagonistFactionId: 'faction-gilded-court',
    missingRelatives: [],
  },
  debtAmount: 800,
  debtClaimantNpcId: 'npc-enemy-harlen-voss',
  debtEnforcementFactionId: 'faction-gilded-court',
  debtBeneficiaryFactionId: 'faction-house-merrow',
  debtDueDay: 30,
  debtPaid: false,
  debtCrisisTriggered: false,
  houseDistrictId: 'district-the-pale',
  stash: { weapons: [], armors: [] },
  enabledActions: [],
  playerStatuses: [],
  activeTrainingBonuses: [],
  tempStatBoosts: [],
  equippedTools: [],
  evidenceInventory: [],
  houseImprovements: { waterQuality: 0, herbSupply: 0, entrySecurity: 0 },
  sleepQualityBonus: 0,
  playerCharacter: {
    name: '',
    attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
    skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
    traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
    level: 1,
    renown: 0,
  },
  mainQuest: { stage: 'searching' as const, lastClue: '' },
  districtTension: {},
  activeDialogueId: null,
  activeDialogueNodeId: null,
  visitedDialogueNodes: {},
  resolvedDialogueChoices: {},
  house: {
    rooms: [
      { roomId: 'room-entrance-hall', name: 'Entrance Hall', state: 'intact' as const, repairCost: 0, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic', decorStyle: null },
      { roomId: 'room-vault', name: 'Cellar / Vault', state: 'locked' as const, repairCost: 0, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic', decorStyle: null },
    ],
    vaultUnlocked: false,
    rosterBonus: 0,
    exteriorState: 'ruined' as const,
    fortificationLevel: 0,
    houseHeirs: [],
    npcPairingPolicy: 'open' as const,
    lastDomesticRelationshipBeat: null,
    relationshipMilestones: [],
  },
  saveVersion: 1,
  timeSlotState: {
    currentSlot: 'morning',
    slotQueue: [],
    completedTasks: [],
    skippedTasks: [],
    slotHistory: [],
    lastProcessedSeed: 42,
  },
  rngSeed: 42,
  rumors: [],
  bondVisibility: {},
  chronicle: { entriesByDay: {}, version: 1 },
  worldEvents: [],
  activeDirectives: [],
  eventInstances: [],
  worldNpcStates: [],
  siteRuntimes: {},
  npcCaptivityStates: {},
  npcSitePresences: [],
  pendingConsumableDecision: null,
  houseWardSeats: 0,
  houseProposalCooldown: 0,
  bondedPersonsRegistry: {},
  pendingDateProposals: [],
  scheduledDates: [],
  npcDateCooldowns: {},
  privateCorrespondence: [],
}

describe('simulateRivalOrgs', () => {
  it('returns expand action when random < 0.10', () => {
    const actions = simulateRivalOrgs(baseState, [0.05, 0.5, 0.5, 0.5])
    expect(actions.some((a) => a.actionType === 'expand')).toBe(true)
  })

  it('returns no actions when random > 0.40', () => {
    const actions = simulateRivalOrgs(baseState, [0.9, 0.9, 0.9, 0.9])
    expect(actions.length).toBe(0)
  })

  it('returns recruit action when 0.10 <= random < 0.22', () => {
    const actions = simulateRivalOrgs(baseState, [0.2, 0.9, 0.9, 0.9])
    expect(actions.some((a) => a.actionType === 'recruit')).toBe(true)
  })

  it('does not return pressure action when cityStability >= 40', () => {
    const highStabilityState = { ...baseState, cityStability: 60 }
    const actions = simulateRivalOrgs(highStabilityState, [0.35, 0.9, 0.9, 0.9])
    expect(actions.some((a) => a.actionType === 'pressure')).toBe(false)
  })

  it('returns pressure action when 0.22 <= random < 0.40 and cityStability < 40', () => {
    const lowStabilityState = { ...baseState, cityStability: 25 }
    const actions = simulateRivalOrgs(lowStabilityState, [0.35, 0.9, 0.9, 0.9])
    expect(actions.some((a) => a.actionType === 'pressure')).toBe(true)
  })

  it('tags actions with the current day', () => {
    const actions = simulateRivalOrgs(baseState, [0.05, 0.05, 0.05, 0.05])
    expect(actions.every((a) => a.day === 5)).toBe(true)
  })

  it('simulates all four rival organizations', () => {
    const actions = simulateRivalOrgs(baseState, [0.05, 0.05, 0.05, 0.05])
    expect(actions.map((action) => action.orgId)).toEqual([
      'rival-org-gilded-hand',
      'rival-org-ashen-compact',
      'org-iron-covenant',
      'org-pale-sisters',
    ])
  })
})

describe('applyRivalActions', () => {
  it('reduces cityStability on expand', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.cityStability).toBe(57)
  })

  it('logs activity on expand with Iron Covenant name', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.activityLog[0]?.message).toContain('Iron Covenant')
  })

  it('logs activity on expand with Pale Sisters name', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-pale-sisters', actionType: 'expand', day: 5 },
    ])
    expect(result.activityLog[0]?.message).toContain('Pale Sisters')
  })

  it('schedules a delayed counter-lead event after expansion', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.pendingEvents.some((event) => event.eventId === 'event-rival-iron-covenant-counter-lead')).toBe(true)
    const scheduled = result.pendingEvents.find((event) => event.eventId === 'event-rival-iron-covenant-counter-lead')
    expect(scheduled?.firedOnDay).toBeGreaterThan(5)
    expect(scheduled?.firedOnDay).toBeLessThanOrEqual(8)
  })

  it('does not schedule a second counter-lead event when that org already has a live lead', () => {
    const stateWithLead = {
      ...baseState,
      availableQuestLeads: [
        {
          leadId: 'quest-rival-iron-covenant-counter-lead-5',
          questId: 'quest-rival-iron-covenant-counter',
          discoveredDay: 5,
          discoverySource: 'event' as const,
          discoveryDistrictId: 'district-ironworks',
          sourceNpcId: null,
          sourcePoiId: null,
          issuerFactionId: 'faction-foundry-league',
          expiresOnDay: 10,
          freshness: 'fresh' as const,
        },
      ],
    }
    const result = applyRivalActions(stateWithLead, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.pendingEvents.some((event) => event.eventId === 'event-rival-iron-covenant-counter-lead')).toBe(false)
  })

  it('schedules a delayed investigation lead event after a recruit action', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'rival-org-ashen-compact', actionType: 'recruit', day: 5 },
    ])
    expect(result.pendingEvents.some((event) => event.eventId === 'event-rival-ashen-compact-counter-lead')).toBe(true)
  })

  it('creates a visible warning event on bribe actions', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'rival-org-gilded-hand', actionType: 'bribe', targetFactionId: 'faction-gilded-court', day: 5 },
    ])
    const pending = result.pendingEvents.find((event) => event.eventId === 'event-rival-gilded-hand-bribe-warning')
    expect(pending).toBeTruthy()
    expect(pending?.firedOnDay).toBe(5)
    expect(pending?.instanceId).toBeTruthy()
    expect(
      result.eventInstances.some(
        (instance) => instance.eventId === 'event-rival-gilded-hand-bribe-warning' && instance.resolvedOnDay === null,
      ),
    ).toBe(true)
  })

  it('reduces cityStability on pressure', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-pale-sisters', actionType: 'pressure', day: 5 },
    ])
    expect(result.cityStability).toBe(55)
  })

  it('increases cityStability by 1 when no pressure or expand actions', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'recruit', day: 5 },
    ])
    expect(result.cityStability).toBe(61)
  })

  it('increases cityStability by 1 when actions list is empty', () => {
    const result = applyRivalActions(baseState, [])
    expect(result.cityStability).toBe(61)
  })

  it('appends action to rivalOrgActions', () => {
    const result = applyRivalActions(baseState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.rivalOrgActions).toHaveLength(1)
    expect(result.rivalOrgActions[0]?.actionType).toBe('expand')
  })

  it('keeps only last 20 rival actions', () => {
    const twentyActions = Array.from({ length: 20 }, (_, i) => ({
      orgId: 'org-iron-covenant',
      actionType: 'recruit' as const,
      day: i + 1,
    }))
    const stateWithActions = { ...baseState, rivalOrgActions: twentyActions }
    const result = applyRivalActions(stateWithActions, [
      { orgId: 'org-pale-sisters', actionType: 'recruit', day: 21 },
    ])
    expect(result.rivalOrgActions).toHaveLength(20)
    expect(result.rivalOrgActions[19]?.day).toBe(21)
  })

  it('does not go below 0 cityStability', () => {
    const lowState = { ...baseState, cityStability: 2 }
    const result = applyRivalActions(lowState, [
      { orgId: 'org-iron-covenant', actionType: 'expand', day: 5 },
    ])
    expect(result.cityStability).toBe(0)
  })

  it('does not exceed 100 cityStability on recovery', () => {
    const fullState = { ...baseState, cityStability: 100 }
    const result = applyRivalActions(fullState, [])
    expect(result.cityStability).toBe(100)
  })
})
