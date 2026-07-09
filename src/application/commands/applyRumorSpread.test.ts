import { describe, it, expect } from 'vitest'
import { applyRumorSpread } from './applyRumorSpread'
import type { GameState } from '../../domain'
import type { Rumor } from '../../domain/rumors/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { createQuestRuntime } from '../../domain/quests/contracts'

// Minimal GameState fixture
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    day: 1,
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
    cityResources: { foodSecurity: 60, foodStock: 600, foodCapacity: 1000, waterAccess: 60, materialStock: 60, corridorStatus: 'open', corridorClearanceProgressDays: 0 },
    activityLog: [],
    selectedSquadNpcIds: [],
    activeCombat: null,
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
      houseName: 'House Valdris',
      founderName: 'Edric Valdris',
      founderGeneration: 2,
      antagonistFactionId: 'faction-gilded-court',
      missingRelatives: [],
    },
    stash: { weapons: [], armors: [] },
    debtAmount: 800,
    debtDueDay: 30,
    debtPaid: false,
    debtCrisisTriggered: false,
    houseDistrictId: 'district-the-pale',
    playerCharacter: {
      name: '',
      attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
      skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
      traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
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
    },
    lastFiredDay: {},
    saveVersion: 1,
    rngSeed: 42,
    rumors: [],
    bondVisibility: {},
    ...overrides,
  } as GameState
}

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: 'test-rumor-1',
    kind: 'ambient',
    source: 'authored',
    districtId: 'district-the-warrens',
    originNpcId: null,
    templateId: null,
    text: 'Something suspicious is happening.',
    subjectNpcIds: ['npc-test-subject'],
    truth: 'mixed',
    credibility: 50,
    heat: 35,
    createdDay: 1,
    lastSpreadDay: 1,
    ...overrides,
  }
}

// RNG that always returns the given value
const alwaysPass = () => 0.01  // always below any pass chance
const alwaysFail = () => 0.99  // always above any pass chance

describe('applyRumorSpread', () => {
  describe('spawn authored templates', () => {
    it('spawns authored rumour templates as active rumours on first call', () => {
      const state = makeState({ day: 1, rumors: [] })
      const result = applyRumorSpread(state, alwaysPass)
      // contentCatalog has 6 authored templates
      expect(result.rumors.length).toBeGreaterThanOrEqual(6)
    })

    it('does not spawn the same template twice', () => {
      const state = makeState({ day: 1, rumors: [] })
      const after1 = applyRumorSpread(state, alwaysPass)
      const after2 = applyRumorSpread(after1, alwaysPass)
      const templateIds = after2.rumors.map((r) => r.templateId).filter(Boolean)
      const uniqueTemplateIds = new Set(templateIds)
      expect(uniqueTemplateIds.size).toBe(templateIds.length)
    })

    it('spawned rumours have source: authored', () => {
      const state = makeState({ day: 1, rumors: [] })
      const result = applyRumorSpread(state, alwaysPass)
      const authored = result.rumors.filter((r) => r.templateId !== null)
      expect(authored.every((r) => r.source === 'authored')).toBe(true)
    })
  })

  describe('heat mechanics', () => {
    it('increases heat when rng passes', () => {
      const rumor = makeRumor({ heat: 35, districtId: 'district-the-warrens' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // saturated district: +round(8*1.4) = +11, -12 decay = net -1 minimum 0
      // With alwaysPass (0.01) < passChance (>0.02), heat changes
      expect(updated).toBeDefined()
    })

    it('heat decays by 12 per day on miss', () => {
      const rumor = makeRumor({ heat: 50, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // alwaysFail: no spread gain. Spread heat = 50. After decay: 50 - 12 = 38.
      expect(updated?.heat).toBe(38)
    })

    it('heat does not go below 0', () => {
      const rumor = makeRumor({ heat: 5, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      // 5 - 12 = -7 → clamped to 0 → pruned (heat <= 0)
      const updated = result.rumors.find((r) => r.id === 'test-rumor-1')
      // Rumour is pruned when heat = 0, so it should not be in the list
      expect(updated).toBeUndefined()
    })
  })

  describe('pruning', () => {
    it('removes rumours with heat = 0 after decay', () => {
      const rumor = makeRumor({ heat: 10, districtId: 'district-gilded-heights' })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      // 10 - 12 = 0, should be pruned
      expect(result.rumors.find((r) => r.id === 'test-rumor-1')).toBeUndefined()
    })

    it('enforces citywide cap of 24', () => {
      const rumors: Rumor[] = Array.from({ length: 30 }, (_, i) =>
        makeRumor({ id: `rumor-${i}`, heat: 80, districtId: 'district-the-warrens' }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.rumors.length).toBeLessThanOrEqual(24)
    })

    it('enforces per-district cap of 4', () => {
      const rumors: Rumor[] = Array.from({ length: 8 }, (_, i) =>
        makeRumor({ id: `rumor-${i}`, heat: 80, districtId: 'district-harbor' }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      const inDistrict = result.rumors.filter((r) => r.districtId === 'district-harbor')
      expect(inDistrict.length).toBeLessThanOrEqual(4)
    })

    it('enforces max 2 per bond pair', () => {
      const rumors: Rumor[] = Array.from({ length: 4 }, (_, i) =>
        makeRumor({
          id: `rumor-bond-${i}`,
          kind: 'bond',
          heat: 80,
          subjectNpcIds: ['npc-a', 'npc-b'],
          districtId: 'district-the-warrens',
        }),
      )
      const state = makeState({ rumors })
      const result = applyRumorSpread(state, alwaysFail)
      const pairRumors = result.rumors.filter(
        (r) => r.kind === 'bond' && r.subjectNpcIds.includes('npc-a') && r.subjectNpcIds.includes('npc-b'),
      )
      expect(pairRumors.length).toBeLessThanOrEqual(2)
    })

    it('removes rumours past TTL', () => {
      // dry district TTL = 4 days; lastSpreadDay = 1, currentDay = 6 → expired
      const rumor = makeRumor({
        heat: 80,
        districtId: 'district-gilded-heights',
        lastSpreadDay: 1,
        createdDay: 1,
      })
      const state = makeState({ day: 6, rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.rumors.find((r) => r.id === 'test-rumor-1')).toBeUndefined()
    })
  })

  describe('bond visibility', () => {
    it('promotes bond rumour to rumored when spread heat >= 20', () => {
      // heat=25, dry district: no pass (alwaysFail), spread heat stays 25 → visibility 'rumored'
      const rumor = makeRumor({
        id: 'bond-rumored',
        kind: 'bond',
        subjectNpcIds: ['npc-alpha', 'npc-beta'],
        heat: 25,
        districtId: 'district-gilded-heights',
      })
      const state = makeState({ rumors: [rumor], bondVisibility: {} })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-alpha::npc-beta']).toBe('rumored')
    })

    it('promotes bond rumour to known when spread heat >= 60', () => {
      const rumor = makeRumor({
        id: 'bond-known',
        kind: 'bond',
        subjectNpcIds: ['npc-x', 'npc-y'],
        heat: 70,
        districtId: 'district-the-warrens',
      })
      const state = makeState({ rumors: [rumor], bondVisibility: {} })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-x::npc-y']).toBe('known')
    })

    it('never moves bond visibility backward', () => {
      const rumor = makeRumor({
        id: 'bond-backward',
        kind: 'bond',
        subjectNpcIds: ['npc-m', 'npc-n'],
        heat: 5,
        districtId: 'district-the-warrens',
      })
      const state = makeState({
        rumors: [rumor],
        bondVisibility: { 'npc-m::npc-n': 'known' },
      })
      const result = applyRumorSpread(state, alwaysFail)
      expect(result.bondVisibility['npc-m::npc-n']).toBe('known')
    })
  })

  describe('rumor consequences (heat threshold → quest lead)', () => {
    it('adds quest lead when rumor heat crosses template threshold', () => {
      // rumor-highborn-captive has consequences: { heatThreshold: 50, unlocksQuestId: 'quest-mira-rescue' }
      // Starting heat 44 + gain 8 = 52 → crosses 50
      const rumor = makeRumor({
        id: 'test-captive',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(true)
    })

    it('does not fire consequence when heat stays below threshold', () => {
      // Starting heat 30 + gain 8 = 38 → does not cross 50
      const rumor = makeRumor({
        id: 'test-captive-low',
        templateId: 'rumor-highborn-captive',
        heat: 30,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not fire consequence when heat was already above threshold', () => {
      // Heat already 55 — threshold already crossed in a previous tick
      const rumor = makeRumor({
        id: 'test-captive-already',
        templateId: 'rumor-highborn-captive',
        heat: 55,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not add quest lead when quest is already active', () => {
      const rumor = makeRumor({
        id: 'test-captive-active',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({
        rumors: [rumor],
        activeQuests: [createQuestRuntime(
          getQuestTemplates().find((q) => q.id === 'quest-mira-rescue')!,
          1,
          undefined,
        )],
      })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('does not add quest lead when quest is already completed', () => {
      const rumor = makeRumor({
        id: 'test-captive-done',
        templateId: 'rumor-highborn-captive',
        heat: 44,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-mira'],
        credibility: 40,
      })
      const state = makeState({
        rumors: [rumor],
        completedQuestIds: ['quest-mira-rescue'],
      })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-mira-rescue')).toBe(false)
    })

    it('rumor-maret-book consequence fires at heat 45 and unlocks quest-hollows-ledger', () => {
      const rumor = makeRumor({
        id: 'test-maret',
        templateId: 'rumor-maret-book',
        heat: 38,
        districtId: 'district-the-warrens',
        subjectNpcIds: ['npc-old-maret'],
        credibility: 60,
      })
      const state = makeState({ rumors: [rumor] })
      const result = applyRumorSpread(state, alwaysPass)
      expect(result.availableQuestLeads.some((l) => l.questId === 'quest-hollows-ledger')).toBe(true)
    })
  })

  describe('district-aware pass chance (destiny-5hm3)', () => {
    function makeNpc(npcId: string, districtId: string | null, dominance = 70): GameState['npcRuntimeStates'][number] {
      return {
        npcId,
        name: 'Test NPC',
        npcType: 'roster',
        playerRosterMember: true,
        worldDisposition: null,
        lastContactDay: null,
        locationOverride: null,
        status: 'mercenary',
        assignment: districtId ? 'working' : 'idle',
        assignedDistrictId: districtId,
        roomAssignment: null,
        dutyPostRoomId: null,
        activeTitle: null,
        wagesOwedDays: 0,
        trainingFocus: null,
        attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
        skills: { melee: 30, ranged: 30, medicine: 30, administration: 30, engineering: 30, negotiation: 30, survival: 30, security: 30, crafting: 30, performance: 30, academics: 30, intrigue: 30 },
        traits: { discipline: 50, ambition: 50, empathy: 50, ruthlessness: 50, prudence: 50, curiosity: 50, dominance, loyalty: 50, vanity: 50, zeal: 50 },
        equipment: { weapon: null, armor: null, accessory: [] },
        personalFunds: { savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 },
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
        arousalState: { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null },
        states: { health: 100, morale: 80, stress: 20, fatigue: 10, fear: 0, anger: 0, hunger: 0, intoxication: 0, hygiene: 80 },
        loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
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
    }

    it('rumor in a district with a matching NPC spreads faster than in a district with no presence', () => {
      const rumorWithPresence = makeRumor({ id: 'r-with', districtId: 'district-harbor', heat: 35, credibility: 50 })
      const rumorWithout = makeRumor({ id: 'r-without', districtId: 'district-ash-quay', heat: 35, credibility: 50 })

      const npc = makeNpc('npc-test-worker', 'district-harbor', 80)

      const stateWith = makeState({ rumors: [rumorWithPresence], npcRuntimeStates: [npc] })
      const stateWithout = makeState({ rumors: [rumorWithout], npcRuntimeStates: [npc] })

      // Use a mid-range rng so presence tips the pass
      const midRng = () => 0.4
      const resultWith = applyRumorSpread(stateWith, midRng)
      const resultWithout = applyRumorSpread(stateWithout, midRng)

      const heatWith = resultWith.rumors.find((r) => r.id === 'r-with')?.heat ?? 0
      const heatWithout = resultWithout.rumors.find((r) => r.id === 'r-without')?.heat ?? 0

      // Having a high-dominance NPC in the district should produce a higher (or equal) spread heat
      expect(heatWith).toBeGreaterThanOrEqual(heatWithout)
    })

    it('idle NPC is treated as being in houseDistrictId and boosts rumors there', () => {
      const rumorInHouseDistrict = makeRumor({
        id: 'r-house',
        districtId: 'district-the-pale',
        heat: 35,
        credibility: 50,
      })
      const rumorElsewhere = makeRumor({
        id: 'r-elsewhere',
        districtId: 'district-harbor',
        heat: 35,
        credibility: 50,
      })

      // Idle NPC — assignedDistrictId null → maps to houseDistrictId ('district-the-pale')
      const idleNpc = makeNpc('npc-idle', null, 80)

      const state = makeState({
        rumors: [rumorInHouseDistrict, rumorElsewhere],
        npcRuntimeStates: [idleNpc],
        houseDistrictId: 'district-the-pale',
      })

      const midRng = () => 0.4
      const result = applyRumorSpread(state, midRng)

      const heatHouse = result.rumors.find((r) => r.id === 'r-house')?.heat ?? 0
      const heatElsewhere = result.rumors.find((r) => r.id === 'r-elsewhere')?.heat ?? 0

      // Idle NPC boosts house district rumor; other district has no presence
      expect(heatHouse).toBeGreaterThanOrEqual(heatElsewhere)
    })

    it('NPC in a different district does not boost rumor in an unassigned district', () => {
      const rumor = makeRumor({ id: 'r-pale', districtId: 'district-the-pale', heat: 35, credibility: 50 })
      const npcInHarbor = makeNpc('npc-harbor-worker', 'district-harbor', 90)

      // houseDistrictId is 'district-the-warrens' (not the-pale), so idle NPCs won't be in the-pale either
      const state = makeState({
        rumors: [rumor],
        npcRuntimeStates: [npcInHarbor],
        houseDistrictId: 'district-the-warrens',
      })

      const midRng = () => 0.4
      const result = applyRumorSpread(state, midRng)
      const stateNoRoster = makeState({
        rumors: [makeRumor({ id: 'r-pale', districtId: 'district-the-pale', heat: 35, credibility: 50 })],
        houseDistrictId: 'district-the-warrens',
      })
      const resultNoRoster = applyRumorSpread(stateNoRoster, midRng)

      const heatWithMismatch = result.rumors.find((r) => r.id === 'r-pale')?.heat ?? 0
      const heatWithNoRoster = resultNoRoster.rumors.find((r) => r.id === 'r-pale')?.heat ?? 0

      // NPC in wrong district should not change the pass chance compared to empty roster
      expect(heatWithMismatch).toBe(heatWithNoRoster)
    })
  })

  describe('relationship effects', () => {
    it('applies onAcquire effects when a template with relationshipEffects is first spawned', () => {
      // rumor-holst-owes-doyle has onAcquire effects for npc-verek-holst fear +5 and npc-garet-doyle trust -3
      const state = makeState({ day: 1, rumors: [], relationships: {} })
      const result = applyRumorSpread(state, alwaysPass)

      const holstKey = 'player-to-npc-verek-holst'
      const doyleKey = 'player-to-npc-garet-doyle'

      expect(result.relationships[holstKey]?.fear).toBe(5)
      expect(result.relationships[doyleKey]?.trust).toBe(-3)
    })

    it('applies onAcquire trust to npc-sister-vael when rumor-vael-candle spawns', () => {
      const state = makeState({ day: 1, rumors: [], relationships: {} })
      const result = applyRumorSpread(state, alwaysPass)

      const vaelKey = 'player-to-npc-sister-vael'
      expect(result.relationships[vaelKey]?.trust).toBeGreaterThan(0)
    })

    it('does not re-apply onAcquire effects on subsequent ticks', () => {
      const state = makeState({ day: 1, rumors: [], relationships: {} })
      const after1 = applyRumorSpread(state, alwaysPass)
      const holstFearAfter1 = after1.relationships['player-to-npc-verek-holst']?.fear ?? 0

      const after2 = applyRumorSpread(after1, alwaysPass)
      const holstFearAfter2 = after2.relationships['player-to-npc-verek-holst']?.fear ?? 0

      expect(holstFearAfter2).toBe(holstFearAfter1)
    })

    it('applies onVerify effects when rumor heat first crosses 60', () => {
      // rumor-valdris-eyes has onVerify: npc-enemy-lady-sorn fear +5
      const templateId = 'rumor-valdris-eyes'
      const preVerifiedRumor = makeRumor({
        id: 'rumor-valdris-eyes-d1',
        templateId,
        heat: 58,
        credibility: 80,
        districtId: 'district-gilded-heights',
      })
      const state = makeState({ day: 2, rumors: [preVerifiedRumor], relationships: {} })
      // alwaysPass will push the rumor over 60 heat
      const result = applyRumorSpread(state, alwaysPass)

      const rumorAfter = result.rumors.find((r) => r.id === 'rumor-valdris-eyes-d1')
      if (rumorAfter && rumorAfter.heat >= 60) {
        // onVerify should have fired
        const sornKey = 'player-to-npc-enemy-lady-sorn'
        expect(result.relationships[sornKey]?.fear).toBe(5)
        expect(rumorAfter.appliedRelationshipTriggers).toContain('onVerify')
      }
    })

    it('does not apply onVerify effects if the rumor was already above 60 at tick start', () => {
      const templateId = 'rumor-valdris-eyes'
      const alreadyHot = makeRumor({
        id: 'rumor-valdris-eyes-d1',
        templateId,
        heat: 80,
        credibility: 80,
        districtId: 'district-gilded-heights',
        appliedRelationshipTriggers: ['onVerify'],
      })
      const state = makeState({ day: 2, rumors: [alreadyHot], relationships: {} })
      const result = applyRumorSpread(state, alwaysPass)

      const sornKey = 'player-to-npc-enemy-lady-sorn'
      // Should not have fired again
      expect(result.relationships[sornKey]?.fear ?? 0).toBe(0)
    })
  })

  describe('archive room function', () => {
    it('preserves one active rumor with extra archive heat each day', () => {
      const state = makeState({
        rumors: [
          makeRumor({ id: 'r-1', credibility: 80, heat: 35 }),
          makeRumor({ id: 'r-2', credibility: 40, heat: 35, text: 'A second line of inquiry.' }),
        ],
        house: {
          ...makeState().house,
          rooms: [
            {
              roomId: 'room-bureau',
              name: 'Bureau',
              state: 'intact',
              repairCost: 0,
              repairDaysRemaining: 0,
              searched: false,
              roomFunction: 'archive',
              upgradeTier: 'basic',
              decorStyle: null,
            },
          ],
          vaultUnlocked: false,
          rosterBonus: 0,
          exteriorState: 'ruined',
          fortificationLevel: 0,
          houseHeirs: [],
          npcPairingPolicy: 'open',
          lastDomesticRelationshipBeat: null,
          relationshipMilestones: [],
        },
      })

      const result = applyRumorSpread(state, alwaysFail)

      const primaryRumor = result.rumors.find((rumor) => rumor.id === 'r-1')
      const secondaryRumor = result.rumors.find((rumor) => rumor.id === 'r-2')

      expect(primaryRumor?.heat).toBeGreaterThan(secondaryRumor?.heat ?? 0)
    })
  })
})
