import { describe, expect, it } from 'vitest'

import { appendActivityLogEntry, generateActivityLogId, MAX_ACTIVITY_ENTRIES } from './activityLog'
import type { GameState, ActivityLogEntry } from '../../domain'

function createMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    day: overrides.day ?? 1,
    timeSlot: overrides.timeSlot ?? 'morning',
    money: overrides.money ?? 100,
    protagonistName: overrides.protagonistName ?? 'Test',
    hasSeenOpening: overrides.hasSeenOpening ?? false,
    isFirstRun: overrides.isFirstRun ?? false,
    cityDials: overrides.cityDials ?? { control: 50, prosperity: 50, unrest: 30, corruption: 20 },
    factionStandings: overrides.factionStandings ?? {},
    factionStates: overrides.factionStates ?? [],
    districts: overrides.districts ?? [],
    roster: overrides.roster ?? [],
    inventory: overrides.inventory ?? [],
    cityResources: overrides.cityResources ?? { foodSecurity: 60, foodStock: 600, foodCapacity: 1000, waterAccess: 60, materialStock: 60, corridorStatus: 'open' },
    activityLog: overrides.activityLog ?? [],
    selectedSquadNpcIds: overrides.selectedSquadNpcIds ?? [],
    activeCombat: overrides.activeCombat ?? null,
    lastEncounterSummary: overrides.lastEncounterSummary ?? null,
    lastResolvedEventSummary: overrides.lastResolvedEventSummary ?? null,
    pendingEvents: overrides.pendingEvents ?? [],
    currentDistrictId: overrides.currentDistrictId ?? null,
    availableForHire: overrides.availableForHire ?? [],
    availableQuestLeads: overrides.availableQuestLeads ?? [],
    activeQuests: overrides.activeQuests ?? [],
    completedQuestIds: overrides.completedQuestIds ?? [],
    councilSeats: overrides.councilSeats ?? {},
    institutionalStanding: overrides.institutionalStanding ?? {},
    activeCouncilVotes: overrides.activeCouncilVotes ?? [],
    relationships: overrides.relationships ?? {},
    equippedItemDurabilities: overrides.equippedItemDurabilities ?? {},
    activeInvestigation: overrides.activeInvestigation ?? null,
    lastInvestigationResult: overrides.lastInvestigationResult ?? null,
    lastFiredDay: overrides.lastFiredDay ?? {},
    rivalOrgActions: overrides.rivalOrgActions ?? [],
    cityStability: overrides.cityStability ?? 60,
    expeditionState: overrides.expeditionState ?? {
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
    householdLore: overrides.householdLore ?? {
      houseName: 'House Test',
      founderName: 'Test Founder',
      founderGeneration: 1,
      antagonistFactionId: 'faction-gilded-court',
      missingRelatives: [],
    },
    debtAmount: overrides.debtAmount ?? 800,
    debtClaimantNpcId: overrides.debtClaimantNpcId ?? 'npc-enemy-harlen-voss',
    debtEnforcementFactionId: overrides.debtEnforcementFactionId ?? 'faction-gilded-court',
    debtBeneficiaryFactionId: overrides.debtBeneficiaryFactionId ?? 'faction-house-merrow',
    debtDueDay: overrides.debtDueDay ?? 30,
    debtPaid: overrides.debtPaid ?? false,
    debtCrisisTriggered: overrides.debtCrisisTriggered ?? false,
    houseDistrictId: overrides.houseDistrictId ?? 'district-the-pale',
    stash: overrides.stash ?? { weapons: [], armors: [] },
    playerCharacter: overrides.playerCharacter ?? {
      name: '',
      attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
      skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
      traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
      level: 1,
      renown: 0,
    },
    mainQuest: overrides.mainQuest ?? { stage: 'searching', lastClue: '' },
    districtTension: overrides.districtTension ?? {},
    activeDialogueId: overrides.activeDialogueId ?? null,
    activeDialogueNodeId: overrides.activeDialogueNodeId ?? null,
    visitedDialogueNodes: overrides.visitedDialogueNodes ?? {},
    resolvedDialogueChoices: overrides.resolvedDialogueChoices ?? {},
    house: overrides.house ?? {
      rooms: [],
      vaultUnlocked: false,
      rosterBonus: 0,
      exteriorState: 'ruined',
      fortificationLevel: 0,
      houseHeirs: [],
      npcPairingPolicy: 'open',
      lastDomesticRelationshipBeat: null,
    },
    saveVersion: overrides.saveVersion ?? 3,
    rngSeed: overrides.rngSeed ?? 42,
    rumors: overrides.rumors ?? [],
    bondVisibility: overrides.bondVisibility ?? {},
    ownedItems: overrides.ownedItems ?? [],
    houseStorageCapacity: overrides.houseStorageCapacity ?? 40,
    installedHouseModules: overrides.installedHouseModules ?? [],
    eventInstances: overrides.eventInstances ?? [],
    worldNpcStates: overrides.worldNpcStates ?? [],
    siteRuntimes: overrides.siteRuntimes ?? {},
    npcCaptivityStates: overrides.npcCaptivityStates ?? {},
    npcSitePresences: overrides.npcSitePresences ?? [],
    pendingConsumableDecision: overrides.pendingConsumableDecision ?? null,
    houseWardSeats: overrides.houseWardSeats ?? 0,
    failedQuestIds: overrides.failedQuestIds ?? [],
    questHistory: overrides.questHistory ?? [],
    bondedPersonsRegistry: overrides.bondedPersonsRegistry ?? {},
    chronicle: overrides.chronicle ?? { entriesByDay: {}, version: 1 },
  }
}

describe('generateActivityLogId', () => {
  it('generates id with sequence 1 for empty log', () => {
    const id = generateActivityLogId([], 1, 'morning')
    expect(id).toBe('log-1-morning-1')
  })

  it('increments sequence for same day+slot', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
      { id: 'log-1-morning-2', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
    ]
    const id = generateActivityLogId(log, 1, 'morning')
    expect(id).toBe('log-1-morning-3')
  })

  it('generates separate sequences for different slots', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
    ]
    const afternoonId = generateActivityLogId(log, 1, 'afternoon')
    expect(afternoonId).toBe('log-1-afternoon-1')
  })

  it('generates separate sequences for different days', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
    ]
    const day2Id = generateActivityLogId(log, 2, 'morning')
    expect(day2Id).toBe('log-2-morning-1')
  })

  it('handles existing ids with rescue suffix pattern', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-rescue-npc-1', day: 1, timeSlot: 'morning', category: 'system', message: 'test' },
      { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
      { id: 'log-1-morning-5', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
    ]
    const id = generateActivityLogId(log, 1, 'morning')
    expect(id).toBe('log-1-morning-6')
  })

  it('skips non-numeric suffixes when finding max sequence', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-rescue-npc-abc', day: 1, timeSlot: 'morning', category: 'system', message: 'test' },
      { id: 'log-1-morning-3', day: 1, timeSlot: 'morning', category: 'economy', message: 'test' },
    ]
    const id = generateActivityLogId(log, 1, 'morning')
    expect(id).toBe('log-1-morning-4')
  })
})

describe('appendActivityLogEntry', () => {
  it('adds entry to empty log', () => {
    const state = createMinimalState({ activityLog: [] })
    const result = appendActivityLogEntry(state, 'economy', 'Test message')

    expect(result.activityLog).toHaveLength(1)
    expect(result.activityLog[0]?.message).toBe('Test message')
    expect(result.activityLog[0]?.id).toBe('log-1-morning-1')
  })

  it('prepends new entry to log', () => {
    const state = createMinimalState({
      activityLog: [
        { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy' as const, message: 'Old message' },
      ],
    })
    const result = appendActivityLogEntry(state, 'combat', 'New message')

    expect(result.activityLog).toHaveLength(2)
    expect(result.activityLog[0]?.message).toBe('New message')
    expect(result.activityLog[1]?.message).toBe('Old message')
  })

  it('generates unique ids for multiple entries in same day+slot', () => {
    let state = createMinimalState({ activityLog: [] })

    for (let i = 0; i < 50; i++) {
      state = appendActivityLogEntry(state, 'economy', `Message ${i + 1}`)
    }

    const ids = state.activityLog.map((e) => e.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(50)
    expect(state.activityLog).toHaveLength(50)
  })

  it('enforces max cap of 100 entries', () => {
    let state = createMinimalState({ activityLog: [] })

    // Add 150 entries
    for (let i = 0; i < 150; i++) {
      state = appendActivityLogEntry(state, 'economy', `Message ${i + 1}`)
    }

    expect(state.activityLog).toHaveLength(MAX_ACTIVITY_ENTRIES)
    expect(MAX_ACTIVITY_ENTRIES).toBe(100)
  })

  it('maintains unique ids even after eviction at cap', () => {
    let state = createMinimalState({ activityLog: [] })

    // Fill to cap (100 entries)
    for (let i = 0; i < 100; i++) {
      state = appendActivityLogEntry(state, 'economy', `Day 1 message ${i + 1}`)
    }

    expect(state.activityLog).toHaveLength(100)

    // Advance to day 2 and add more entries
    state = createMinimalState({
      day: 2,
      timeSlot: 'morning',
      activityLog: state.activityLog,
    })

    for (let i = 0; i < 10; i++) {
      state = appendActivityLogEntry(state, 'combat', `Day 2 message ${i + 1}`)
    }

    // Should have 100 entries (some day 1 evicted, all day 2 kept)
    expect(state.activityLog).toHaveLength(100)

    // All day 2 entries should have unique ids
    const day2Entries = state.activityLog.filter((e) => e.day === 2)
    const day2Ids = day2Entries.map((e) => e.id)
    const uniqueDay2Ids = new Set(day2Ids)

    expect(uniqueDay2Ids.size).toBe(day2Entries.length)
    expect(day2Entries.length).toBeGreaterThan(0)
  })

  it('handles mixed day+slot entries correctly', () => {
    const log: ActivityLogEntry[] = [
      { id: 'log-1-morning-1', day: 1, timeSlot: 'morning', category: 'economy', message: 'Day 1 morning' },
      { id: 'log-1-afternoon-1', day: 1, timeSlot: 'afternoon', category: 'economy', message: 'Day 1 afternoon' },
      { id: 'log-2-morning-1', day: 2, timeSlot: 'morning', category: 'economy', message: 'Day 2 morning' },
    ]
    const state = createMinimalState({
      day: 1,
      timeSlot: 'afternoon',
      activityLog: log,
    })

    const result = appendActivityLogEntry(state, 'system', 'New afternoon entry')

    expect(result.activityLog[0]?.id).toBe('log-1-afternoon-2')
  })
})

describe('MAX_ACTIVITY_ENTRIES', () => {
  it('is set to 100 to match documentation', () => {
    expect(MAX_ACTIVITY_ENTRIES).toBe(100)
  })
})
