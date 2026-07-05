import { describe, expect, it } from 'vitest'
import {
  calculateNpcIntention,
  processNpcIntentions,
  clearNpcIntention,
  executeNpcIntention,
  executeAllNpcIntentions,
  processAllowlistedNpcIntentions,
  executeAllowlistedNpcIntentions,
  WIRED_INTENTION_TYPES,
  intentionHandlers,
} from './intentions'
import { WORLD_ELIGIBLE_INTENTION_TYPES } from './intentions/eligibility'
import type { GameState, NpcRuntimeState, NpcIntentionType } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'
import { idaRhysRosterEntry } from './testFixtures'

describe('intentions', () => {
  const createTestState = (overrides: Partial<GameState> = {}): GameState => ({
    ...initialGameStateSnapshot,
    npcRuntimeStates: [
      {
        ...initialGameStateSnapshot.npcRuntimeStates[0]!,
        factionRelationships: [],
        currentIntention: null,
      },
    ],
    ...overrides,
  })

  describe('calculateNpcIntention', () => {
    it('returns null for NPC with player assignment', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'deployed',
            currentDirectiveId: null,
            factionRelationships: [],
            currentIntention: null,
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).toBeNull()
    })

    it('returns null for NPC with faction directive', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: 'directive-test-123',
            factionRelationships: [],
            currentIntention: null,
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).toBeNull()
    })

    it('returns null for ward NPC', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            status: 'ward',
            factionRelationships: [],
            currentIntention: null,
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).toBeNull()
    })

    it('returns an intention for eligible idle NPC', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            factionRelationships: [],
            currentIntention: null,
            // Boost traits to ensure an intention is generated
            traits: {
              ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits,
              ambition: 75,
              discipline: 65,
            },
            attributes: {
              ...initialGameStateSnapshot.npcRuntimeStates[0]!.attributes,
              presence: 70,
            },
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).not.toBeNull()
      if (intention) {
        expect(intention.type).toBeDefined()
        expect(intention.priority).toBeGreaterThanOrEqual(1)
        expect(intention.priority).toBeLessThanOrEqual(5)
        expect(intention.confidence).toBeGreaterThanOrEqual(0)
        expect(intention.confidence).toBeLessThanOrEqual(100)
        expect(intention.urgencyDays).toBeGreaterThanOrEqual(1)
        expect(intention.urgencyDays).toBeLessThanOrEqual(7)
      }
    })

    it('returns null for NPC with low trait scores', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            factionRelationships: [],
            currentIntention: null,
            // Low trait scores
            traits: {
              ambition: 20,
              empathy: 20,
              discipline: 20,
              loyalty: 20,
              ruthlessness: 20,
              curiosity: 20,
              prudence: 20,
              dominance: 20,
              zeal: 20,
              vanity: 20,
            },
            attributes: {
              might: 20,
              agility: 20,
              endurance: 20,
              intellect: 20,
              perception: 20,
              presence: 20,
              resolve: 20,
            },
            skills: {
              melee: 20,
              ranged: 20,
              medicine: 20,
              administration: 20,
              engineering: 20,
              negotiation: 20,
              survival: 20,
              security: 20,
              crafting: 20,
              performance: 20,
              academics: 20,
              intrigue: 20,
            },
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).toBeNull()
    })

    it('returns null for non-existent NPC', () => {
      const state = createTestState()

      const intention = calculateNpcIntention(state, 'non-existent-npc')
      expect(intention).toBeNull()
    })

    it('returns null for captive NPC', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            captivityState: {
              status: 'captive',
              condition: 'healthy' as const,
              compliance: 'resistant' as const,
              bondType: 'none' as const,
              regime: 'unknown' as const,
              holderId: null,
              siteId: null,
              roomId: null,
              timeHeldDays: 1,
              lastTransferDay: null,
              questTag: null,
              confiscatedItems: [],
              confiscatedMoney: null,
              confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
            },
            factionRelationships: [],
            currentIntention: null,
          },
        ],
      })

      const intention = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(intention).toBeNull()
    })
  })

  describe('executeAllNpcIntentions', () => {
    it('processes all NPCs with intentions', () => {
      const intention = {
        type: 'eat-meal' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
        slotSpecificUrgency: { morning: 5, afternoon: 5, evening: 5, night: 1 },
      }
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: intention,
            states: {
              ...initialGameStateSnapshot.npcRuntimeStates[0]!.states,
              hunger: 60,
            },
            factionRelationships: [],
          },
        ],
      }
      const result = executeAllNpcIntentions(state)

      expect(result).toBeDefined()
    })

    it('handles empty roster', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [],
      }
      const result = executeAllNpcIntentions(state)

      expect(result.npcRuntimeStates).toHaveLength(0)
    })

    it('skips NPCs without intentions', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
          },
        ],
      }
      const result = executeAllNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })
  })

  describe('processNpcIntentions', () => {
    it('assigns intentions to idle NPCs', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            status: 'citizen',
            captivityState: undefined,
            factionRelationships: [],
          },
        ],
      }
      const result = processNpcIntentions(state)

      const npc = result.npcRuntimeStates[0]!
      expect(npc.currentIntention).not.toBeNull()
    })

    it('skips NPCs with existing intention', () => {
      const existingIntention = {
        type: 'socialize' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 5,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 6,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: existingIntention,
            status: 'citizen',
            captivityState: undefined,
            factionRelationships: [],
          },
        ],
      }
      const result = processNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBe(existingIntention)
    })

    it('skips NPCs with active directive', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: 'directive-1',
            currentIntention: null,
            status: 'citizen',
            captivityState: undefined,
            factionRelationships: [],
          },
        ],
      }
      const result = processNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('handles empty roster', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [],
      }
      const result = processNpcIntentions(state)

      expect(result.npcRuntimeStates).toHaveLength(0)
    })
  })

  describe('clearNpcIntention', () => {
    it('clears intention for NPC with intention', () => {
      const existingIntention = {
        type: 'socialize' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 5,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 6,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentIntention: existingIntention,
            factionRelationships: [],
          },
        ],
      }
      const result = clearNpcIntention(state, state.npcRuntimeStates[0]!.npcId)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('returns state unchanged for NPC without intention', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            currentIntention: null,
            factionRelationships: [],
          },
        ],
      }
      const result = clearNpcIntention(state, state.npcRuntimeStates[0]!.npcId)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('returns state unchanged for non-existent NPC', () => {
      const state = initialGameStateSnapshot
      const result = clearNpcIntention(state, 'non-existent-npc')

      expect(result).toBe(state)
    })
  })

  describe('executeNpcIntention', () => {
    it('executes intention when canExecute returns true', () => {
      const intention = {
        type: 'eat-meal' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const npc: NpcRuntimeState = {
        ...initialGameStateSnapshot.npcRuntimeStates[0]!,
        assignment: 'idle',
        currentDirectiveId: null,
        currentIntention: intention,
        states: {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!.states,
          hunger: 60,
        },
        factionRelationships: [],
      }
      const state = initialGameStateSnapshot

      const result = executeNpcIntention(npc, state)

      expect(result).toBeDefined()
    })

    it('returns state unchanged for NPC without intention', () => {
      const npc: NpcRuntimeState = {
        ...initialGameStateSnapshot.npcRuntimeStates[0]!,
        currentIntention: null,
        factionRelationships: [],
      }
      const state = initialGameStateSnapshot

      const result = executeNpcIntention(npc, state)

      expect(result).toBe(state)
    })

    it('returns state unchanged when canExecute returns false', () => {
      const intention = {
        type: 'eat-meal' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const npc: NpcRuntimeState = {
        ...initialGameStateSnapshot.npcRuntimeStates[0]!,
        assignment: 'deployed',
        currentDirectiveId: null,
        currentIntention: intention,
        states: {
          ...initialGameStateSnapshot.npcRuntimeStates[0]!.states,
          hunger: 60,
        },
        factionRelationships: [],
      }
      const state = initialGameStateSnapshot

      const result = executeNpcIntention(npc, state)

      expect(result).toBe(state)
    })
  })

  describe('processAllowlistedNpcIntentions (destiny-mbju)', () => {
    it('discards a naturally-generated intention outside the wired allowlist', () => {
      const state = createTestState({
        cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            attributes: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.attributes, presence: 80 },
            traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, ambition: 55, discipline: 30, curiosity: 30 },
            // lead-group (still unwired — no NPC group/squad runtime concept exists) requires a
            // blocked corridor plus presence>=60 && ambition>=50; keep other needs low/moderate so
            // it isn't outranked by an already-wired state-driven candidate like eat-meal/sleep.
            states: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.states, hunger: 10, fatigue: 10, stress: 10, hygiene: 10 },
          },
        ],
      })

      // Sanity check: this state really does produce a non-allowlisted intention via the real pipeline.
      const natural = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(natural).not.toBeNull()
      expect(WIRED_INTENTION_TYPES.has(natural!.type)).toBe(false)

      const result = processAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('never assigns a currentIntention outside the wired allowlist, across a varied roster', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            traits: {
              ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits,
              ambition: 75,
              discipline: 65,
              empathy: 70,
              loyalty: 70,
            },
            attributes: {
              ...initialGameStateSnapshot.npcRuntimeStates[0]!.attributes,
              presence: 70,
            },
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)
      const assigned = result.npcRuntimeStates[0]!.currentIntention

      if (assigned) {
        expect(WIRED_INTENTION_TYPES.has(assigned.type)).toBe(true)
      }
    })

    it('every intention type that aliases an already-wired handler is also in the allowlist (regression: visit-romantic-partner aliased visitLoverHandler but was missing from WIRED_INTENTION_TYPES, so it could never actually fire even though the registry looked wired)', () => {
      // careForInjuredHandler is excluded from this check — it's deliberately reused as a generic
      // no-op stand-in for many still-unbuilt types (and, separately, for the 4 money-earning
      // types whose real execution lives outside the registry in applyMoneyEarningIntentions), so
      // "shares a handler with a wired type" isn't a meaningful signal for it the way it is for a
      // real, single-purpose handler like visitLoverHandler.
      const placeholderHandler = intentionHandlers['care-for-injured']
      const wiredHandlerRefs = new Set(
        [...WIRED_INTENTION_TYPES]
          .map((type) => intentionHandlers[type])
          .filter((handler) => handler !== placeholderHandler),
      )
      const missingAliases: string[] = []

      for (const [type, handler] of Object.entries(intentionHandlers)) {
        if (WIRED_INTENTION_TYPES.has(type as NpcIntentionType)) continue
        if (wiredHandlerRefs.has(handler)) {
          missingAliases.push(type)
        }
      }

      expect(missingAliases).toEqual([])
    })

    it('money-earning types are wired in the allowlist even though their registry entry is the placeholder stand-in (real execution lives in applyMoneyEarningIntentions, outside the registry)', () => {
      const moneyEarningTypes: NpcIntentionType[] = ['seek-tips', 'black-market-trade', 'beg-for-coin', 'scavenge-for-sell']
      for (const type of moneyEarningTypes) {
        expect(WIRED_INTENTION_TYPES.has(type)).toBe(true)
      }
    })

    it('does not overwrite an NPC that already has an intention', () => {
      const existing = {
        type: 'spend-time-with' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 2,
        urgencyDays: 1,
        confidence: 40,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: existing,
            factionRelationships: [],
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toEqual(existing)
    })
  })

  describe('processAllowlistedNpcIntentions — per-npcType eligibility (destiny-rama.10)', () => {
    it('generates an eligible intention for an idle World NPC', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            npcId: 'npc-test-world',
            npcType: 'world',
            playerRosterMember: false,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            captivityState: undefined,
            // High hunger is a strong state-driven signal for eat-meal, which is in
            // WORLD_ELIGIBLE_INTENTION_TYPES (self-care).
            states: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.states, hunger: 90, fatigue: 10, stress: 10, hygiene: 10 },
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)
      const assigned = result.npcRuntimeStates[0]!.currentIntention

      expect(assigned).not.toBeNull()
      expect(WORLD_ELIGIBLE_INTENTION_TYPES.has(assigned!.type)).toBe(true)
    })

    it('discards a wired-but-ineligible (house-only) intention type for a World NPC even though a roster NPC in the identical state would keep it', () => {
      // care-for-injured is wired (WIRED_INTENTION_TYPES) but excluded from
      // WORLD_ELIGIBLE_INTENTION_TYPES (it acts on the player's roster, not the NPC's own life).
      // High player-loyalty (rel.loyalty >= 70) triggers it (alongside protect-house, also
      // house-only) via the relationship-driven pipeline stage, with all self-care needs
      // suppressed so it isn't outranked by a state-driven candidate.
      const baseOverrides = {
        assignment: 'idle' as const,
        currentDirectiveId: null,
        currentIntention: null,
        factionRelationships: [],
        captivityState: undefined,
        traits: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.traits, prudence: 10, vanity: 10, curiosity: 10, ambition: 10, ruthlessness: 10, discipline: 10, dominance: 10, empathy: 60, loyalty: 10 },
        skills: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.skills, medicine: 90 },
        states: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.states, hunger: 5, fatigue: 5, stress: 5, hygiene: 5, anger: 5, fear: 5, morale: 60, intoxication: 0 },
      }

      const rosterEntry = { ...initialGameStateSnapshot.npcRuntimeStates[0]!, ...baseOverrides, npcType: 'roster' as const, playerRosterMember: true }
      const worldEntry = { ...initialGameStateSnapshot.npcRuntimeStates[0]!, ...baseOverrides, npcId: 'npc-test-world', npcType: 'world' as const, playerRosterMember: false }

      // getRelationshipDrivenIntentions (pipeline.ts) keys on `${playerNpcId}|${npc.npcId}`.
      const relationshipWithPlayer = {
        'player|npc-marion-vale': { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 75 },
        'player|npc-test-world': { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 75 },
      }

      const rosterState = createTestState({
        npcRuntimeStates: [rosterEntry],
        relationships: relationshipWithPlayer,
      })
      const worldState = createTestState({
        npcRuntimeStates: [worldEntry],
        relationships: relationshipWithPlayer,
      })

      // Sanity check: this trait/relationship profile really does make the pipeline naturally
      // produce care-for-injured (wired, but not world-eligible) for both — confirming the *only*
      // difference in outcome comes from the new eligibility intersection, not some other gate.
      const naturalRoster = calculateNpcIntention(rosterState, NPC_IDS.MARION_VALE)
      const naturalWorld = calculateNpcIntention(worldState, 'npc-test-world')
      expect(naturalRoster?.type).toBe('care-for-injured')
      expect(naturalWorld?.type).toBe('care-for-injured')
      expect(WIRED_INTENTION_TYPES.has('care-for-injured')).toBe(true)
      expect(WORLD_ELIGIBLE_INTENTION_TYPES.has('care-for-injured')).toBe(false)

      const rosterResult = processAllowlistedNpcIntentions(rosterState)
      const worldResult = processAllowlistedNpcIntentions(worldState)

      expect(rosterResult.npcRuntimeStates[0]!.currentIntention?.type).toBe('care-for-injured')
      expect(worldResult.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('never generates an intention for an npcType:enemy person, even when otherwise idle and eligible by every other gate', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            npcId: 'npc-test-enemy',
            npcType: 'enemy',
            playerRosterMember: false,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            captivityState: undefined,
            states: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.states, hunger: 90 },
          },
        ],
      })

      // Sanity check: isNpcBlockedFromIntention alone would NOT block this npc (idle, no
      // directive, not ward, not captive) — only the npcType:'enemy' eligibility gate does.
      const natural = calculateNpcIntention(state, 'npc-test-enemy')
      expect(natural).not.toBeNull()

      const result = processAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('never generates an intention for a captive person, regardless of npcType', () => {
      const state = createTestState({
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            npcId: 'npc-test-captive-world',
            npcType: 'story',
            playerRosterMember: false,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            states: { ...initialGameStateSnapshot.npcRuntimeStates[0]!.states, hunger: 90 },
            captivityState: {
              status: 'captive',
              condition: 'healthy',
              compliance: 'resistant',
              bondType: 'none',
              regime: 'unknown',
              holderId: null,
              siteId: null,
              roomId: null,
              timeHeldDays: 1,
              lastTransferDay: null,
              questTag: null,
              confiscatedItems: [],
              confiscatedMoney: null,
              confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
            },
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })
  })

  describe('executeAllowlistedNpcIntentions (destiny-mbju)', () => {
    function stateWithMarionAndIda(marionIntention: NpcRuntimeState['currentIntention']) {
      return {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...initialGameStateSnapshot.npcRuntimeStates[0]!,
            assignment: 'idle' as const,
            currentDirectiveId: null,
            currentIntention: marionIntention,
            factionRelationships: [],
          },
          { ...idaRhysRosterEntry, assignment: 'idle' as const, currentDirectiveId: null, currentIntention: null },
        ],
      }
    }

    it('executes visit-lover and clears the intention afterward', () => {
      const intention = {
        type: 'visit-lover' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      state = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 60, trust: 50, respect: 0, fear: 0, loyalty: 0, intimacyStage: 'attachment' },
          [`${idaId}-to-${marionId}`]: { affinity: 60, trust: 50, respect: 0, fear: 0, loyalty: 0, intimacyStage: 'attachment' },
        },
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.relationships[`${marionId}-to-${idaId}`]!.affinity).toBe(61)
      expect(result.relationships[`${idaId}-to-${marionId}`]!.affinity).toBe(61)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes spend-time-with and clears the intention afterward', () => {
      const intention = {
        type: 'spend-time-with' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 2,
        urgencyDays: 1,
        confidence: 40,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      state = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 40, trust: 20, respect: 0, fear: 0, loyalty: 0 },
          [`${idaId}-to-${marionId}`]: { affinity: 40, trust: 20, respect: 0, fear: 0, loyalty: 0 },
        },
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.relationships[`${marionId}-to-${idaId}`]!.affinity).toBe(41)
      expect(result.relationships[`${marionId}-to-${idaId}`]!.trust).toBe(21)
      expect(result.relationships[`${idaId}-to-${marionId}`]!.affinity).toBe(41)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('does not execute or clear an intention outside the wired allowlist', () => {
      const intention = {
        type: 'lead-group' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      const state = stateWithMarionAndIda(intention)

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.currentIntention).toEqual(intention)
    })

    it('executes flirt-with (via tryNpcNpcFlirtation) and clears the intention afterward', () => {
      const intention = {
        type: 'flirt-with' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      state = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 60, trust: 50, respect: 0, fear: 0, loyalty: 0 },
          [`${idaId}-to-${marionId}`]: { affinity: 60, trust: 50, respect: 0, fear: 0, loyalty: 0 },
        },
      }

      const result = executeAllowlistedNpcIntentions(state)

      // Success is RNG-gated internally (createRng(state.rngSeed)) — assert the mechanic ran
      // (seed advanced) and the intention resolved, rather than a specific affinity delta.
      expect(result.rngSeed).not.toBe(state.rngSeed)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes court-romantically (via tryAdvanceIntimacyStage) and clears the intention afterward', () => {
      const intention = {
        type: 'court-romantically' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      // courtRomanticallyHandler.canExecute requires presence>=50 and empathy>=50 on the actor.
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, attributes: { ...state.npcRuntimeStates[0]!.attributes, presence: 60 }, traits: { ...state.npcRuntimeStates[0]!.traits, empathy: 60 } },
          state.npcRuntimeStates[1]!,
        ],
      }
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      state = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 35, trust: 25, respect: 0, fear: 0, loyalty: 0 },
          [`${idaId}-to-${marionId}`]: { affinity: 35, trust: 25, respect: 0, fear: 0, loyalty: 0 },
        },
      }

      const result = executeAllowlistedNpcIntentions(state)

      // Stage progression itself is deterministic (no RNG) — thresholds are comfortably met.
      expect(result.relationships[`${marionId}-to-${idaId}`]!.intimacyStage).toBe('affinity')
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes jealousy-check (via checkJealousyForNpc) and clears the intention afterward', () => {
      const intention = {
        type: 'jealousy-check' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 2,
        urgencyDays: 1,
        confidence: 40,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      // checkJealousyForNpc needs at least 2 other eligible roster NPCs (a target + a rival) to
      // ever call its RNG — a 2-NPC roster (Marion + Ida only) would early-return without
      // consuming the seed, so add a third NPC here.
      const cress = { ...idaRhysRosterEntry, npcId: 'npc-cress-test', name: 'Cress Test', assignment: 'idle' as const, currentIntention: null }
      const state: GameState = {
        ...stateWithMarionAndIda(intention),
        npcRuntimeStates: [...stateWithMarionAndIda(intention).npcRuntimeStates, cress],
      }
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      const stateWithRivalry: GameState = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 80, trust: 40, respect: 0, fear: 0, loyalty: 0 },
          [`${cress.npcId}-to-${idaId}`]: { affinity: 90, trust: 40, respect: 0, fear: 0, loyalty: 0 },
        },
      }

      const result = executeAllowlistedNpcIntentions(stateWithRivalry)

      // Success is RNG-gated internally — assert the mechanic ran and the intention resolved.
      expect(result.rngSeed).not.toBe(stateWithRivalry.rngSeed)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes seek-intimacy (via tryNpcNpcSeekIntimacy) and clears the intention afterward', () => {
      const intention = {
        type: 'seek-intimacy' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 2,
        urgencyDays: 1,
        confidence: 40,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId
      state = {
        ...state,
        relationships: {
          ...state.relationships,
          [`${marionId}-to-${idaId}`]: { affinity: 60, trust: 75, respect: 0, fear: 0, loyalty: 0 },
          [`${idaId}-to-${marionId}`]: { affinity: 60, trust: 75, respect: 0, fear: 0, loyalty: 0 },
        },
      }

      const result = executeAllowlistedNpcIntentions(state)

      // Deterministic once eligible — no RNG gate on the trust threshold itself.
      expect(result.relationships[`${marionId}-to-${idaId}`]!.affinity).toBeGreaterThan(60)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes flirt-aggressively (via tryNpcNpcFlirtAggressively) and clears the intention afterward', () => {
      const intention = {
        type: 'flirt-aggressively' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      // flirtAggressivelyHandler.canExecute requires dominance >= 50 on the actor.
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, traits: { ...state.npcRuntimeStates[0]!.traits, dominance: 60 } },
          state.npcRuntimeStates[1]!,
        ],
      }
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId

      const result = executeAllowlistedNpcIntentions(state)

      // Success is RNG-gated internally — assert the mechanic ran (either affinity rose on
      // success or Ida's anger rose on failure) and the intention resolved either way.
      const abAffinity = result.relationships[`${marionId}-to-${idaId}`]?.affinity ?? 0
      const idaAnger = result.npcRuntimeStates.find((n) => n.npcId === idaId)!.states.anger
      const somethingHappened = abAffinity > 0 || idaAnger > idaRhysRosterEntry.states.anger
      expect(somethingHappened).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes eat-meal (via npcEatMeal) and clears the intention afterward', () => {
      const intention = {
        type: 'eat-meal' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, hunger: 60 } }, state.npcRuntimeStates[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.hunger).toBeLessThan(60)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes drink (via npcDrink) and clears the intention afterward', () => {
      const intention = {
        type: 'drink' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, hunger: 50, intoxication: 40 } },
          state.npcRuntimeStates[1]!,
        ],
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.intoxication).toBeLessThan(40)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes sleep (via npcSleep) and clears the intention afterward', () => {
      const intention = {
        type: 'sleep' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, fatigue: 80 } }, state.npcRuntimeStates[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.fatigue).toBeLessThan(80)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes rest (via npcRest) and clears the intention afterward', () => {
      const intention = {
        type: 'rest' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, fatigue: 50 } }, state.npcRuntimeStates[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.fatigue).toBeLessThan(50)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes groom (via npcGroom) and clears the intention afterward', () => {
      const intention = {
        type: 'groom' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, hygiene: 70 } }, state.npcRuntimeStates[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.hygiene).toBeLessThan(70)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes meditate (via npcMeditate) and clears the intention afterward', () => {
      const intention = {
        type: 'meditate' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, states: { ...state.npcRuntimeStates[0]!.states, stress: 70 } }, state.npcRuntimeStates[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.npcRuntimeStates[0]!.states.stress).toBeLessThan(70)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes confront-rival (via npcConfrontRival) and clears the intention afterward', () => {
      const intention = {
        type: 'confront-rival' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      // npc-alis-vey has an authored rival (npc-enemy-lady-sorn) in npcs.json — both must be on
      // the roster for npcConfrontRival to do anything.
      const state: GameState = {
        ...initialGameStateSnapshot,
        npcRuntimeStates: [
          {
            ...idaRhysRosterEntry,
            npcId: 'npc-alis-vey',
            name: 'Alis Vey',
            assignment: 'idle' as const,
            currentDirectiveId: null,
            currentIntention: intention,
            attributes: { ...idaRhysRosterEntry.attributes, might: 60 },
          },
          { ...idaRhysRosterEntry, npcId: 'npc-enemy-lady-sorn', name: 'Lady Sorn', assignment: 'idle' as const, currentDirectiveId: null, currentIntention: null },
        ],
      }

      const result = executeAllowlistedNpcIntentions(state)

      const rival = result.npcRuntimeStates.find((n) => n.npcId === 'npc-enemy-lady-sorn')!
      const actor = result.npcRuntimeStates.find((n) => n.npcId === 'npc-alis-vey')!
      const somethingHappened = rival.states.fear > idaRhysRosterEntry.states.fear || actor.states.fear > idaRhysRosterEntry.states.fear
      expect(somethingHappened).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes assert-dominance (via npcAssertDominance) and clears the intention afterward', () => {
      const intention = {
        type: 'assert-dominance' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      // assertDominanceHandler.canExecute requires dominance >= 60 on the actor.
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, traits: { ...state.npcRuntimeStates[0]!.traits, dominance: 65 } }, state.npcRuntimeStates[1]!] }
      const marionId = state.npcRuntimeStates[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId

      const result = executeAllowlistedNpcIntentions(state)

      const rel = result.relationships[`${idaId}-to-${marionId}`]
      const actor = result.npcRuntimeStates.find((n) => n.npcId === marionId)!
      const somethingHappened = (rel?.fear ?? 0) > 0 || actor.states.anger > state.npcRuntimeStates[0]!.states.anger
      expect(somethingHappened).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes protect-house (via npcProtectHouse) and clears the intention afterward', () => {
      const intention = {
        type: 'protect-house' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = { ...state, districtTension: { ...state.districtTension, [state.houseDistrictId]: 50 } }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.districtTension[state.houseDistrictId]).toBeLessThan(50)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes patrol-district (via npcPatrolDistrict) and clears the intention afterward', () => {
      const intention = {
        type: 'patrol-district' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      state = {
        ...state,
        npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-the-pale' }, state.npcRuntimeStates[1]!],
        districtTension: { ...state.districtTension, 'district-the-pale': 50 },
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.districtTension['district-the-pale']).toBeLessThan(50)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes fortify-position (via npcFortifyPosition) and clears the intention afterward', () => {
      const intention = {
        type: 'fortify-position' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      // fortifyPositionHandler.canExecute requires security >= 40 or engineering >= 40.
      state = {
        ...state,
        money: 1000,
        npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, skills: { ...state.npcRuntimeStates[0]!.skills, security: 60 } }, state.npcRuntimeStates[1]!],
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.money).toBeLessThan(1000)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes care-for-injured (via npcCareForInjured) and clears the intention afterward', () => {
      const intention = {
        type: 'care-for-injured' as const,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
      let state: GameState = stateWithMarionAndIda(intention)
      // careForInjuredHandler.canExecute requires medicine >= 40 or empathy >= 50.
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, traits: { ...state.npcRuntimeStates[0]!.traits, empathy: 60 } },
          { ...state.npcRuntimeStates[1]!, states: { ...state.npcRuntimeStates[1]!.states, injury: 20, health: 60 } },
        ],
      }

      const result = executeAllowlistedNpcIntentions(state)

      const target = result.npcRuntimeStates.find((n) => n.npcId === idaRhysRosterEntry.npcId)!
      expect(target.states.health).toBeGreaterThan(60)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    function makeIntention(type: NpcIntentionType) {
      return {
        type,
        targetId: 'district-the-pale',
        targetType: 'district' as const,
        priority: 3,
        urgencyDays: 1,
        confidence: 50,
        createdAtDay: 1,
        expiresAtDay: 2,
        validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] as Array<'morning' | 'afternoon' | 'evening' | 'night'>,
      }
    }

    it('executes resource-gather (via npcResourceGather) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('resource-gather'))
      // resourceGatherHandler.canExecute requires survival >= 40 or endurance >= 50.
      state = {
        ...state,
        cityResources: { ...state.cityResources, materialStock: 20 },
        npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, skills: { ...state.npcRuntimeStates[0]!.skills, survival: 50 } }, state.npcRuntimeStates[1]!],
      }
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.cityResources.materialStock).toBeGreaterThan(20)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes scavenge (via npcScavenge) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('scavenge'))
      // scavengeHandler.canExecute requires survival >= 40.
      state = {
        ...state,
        cityResources: { ...state.cityResources, materialStock: 20 },
        npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, skills: { ...state.npcRuntimeStates[0]!.skills, survival: 50 } }, state.npcRuntimeStates[1]!],
      }
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.cityResources.materialStock).toBeGreaterThan(20)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes seek-employment (via npcSeekEmployment) and clears the intention afterward', () => {
      const state: GameState = stateWithMarionAndIda(makeIntention('seek-employment'))
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentEmployment).not.toBeNull()
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes host-gathering (via npcHostGathering) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('host-gathering'))
      state = {
        ...state,
        house: {
          ...state.house,
          rooms: state.house.rooms.map((r, i) => (i === 0 ? { ...r, state: 'intact' as const, roomFunction: 'reception' as const } : r)),
        },
      }
      const result = executeAllowlistedNpcIntentions(state)
      const idaId = idaRhysRosterEntry.npcId
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
      // The host is Marion (roster[0]); Ida is the only other idle NPC available to invite.
      const rel = result.relationships[`${state.npcRuntimeStates[0]!.npcId}-to-${idaId}`]
      expect(rel?.affinity ?? 0).toBeGreaterThan(0)
    })

    it('executes consolidate-power (via npcConsolidatePower) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('consolidate-power'))
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-harbor' }, state.npcRuntimeStates[1]!] }
      const result = executeAllowlistedNpcIntentions(state)
      const changed = Object.entries(result.factionStandings).some(([id, v]) => v > (state.factionStandings[id] ?? 0))
      expect(changed).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes socialize (via npcSocialize) and clears the intention afterward', () => {
      const state: GameState = stateWithMarionAndIda(makeIntention('socialize'))
      const idaId = idaRhysRosterEntry.npcId
      const result = executeAllowlistedNpcIntentions(state)
      const rel = result.relationships[`${state.npcRuntimeStates[0]!.npcId}-to-${idaId}`]
      expect(rel?.affinity ?? 0).toBeGreaterThan(0)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes gossip (via npcGossip) and clears the intention afterward', () => {
      const state: GameState = stateWithMarionAndIda(makeIntention('gossip'))
      const idaId = idaRhysRosterEntry.npcId
      const result = executeAllowlistedNpcIntentions(state)
      const rel = result.relationships[`${state.npcRuntimeStates[0]!.npcId}-to-${idaId}`]
      expect(rel?.affinity ?? 0).toBeGreaterThan(0)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes mediate-conflict (via npcMediateConflict) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('mediate-conflict'))
      const idaId = idaRhysRosterEntry.npcId
      // The mediator (Marion, roster[0]) needs empathy>=50 && negotiation>=40 to canExecute.
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, traits: { ...state.npcRuntimeStates[0]!.traits, empathy: 60 }, skills: { ...state.npcRuntimeStates[0]!.skills, negotiation: 50 } },
          state.npcRuntimeStates[1]!,
          { ...idaRhysRosterEntry, npcId: 'npc-third', name: 'Third', assignment: 'idle' as const },
        ],
        relationships: {
          ...state.relationships,
          [`${idaId}-to-npc-third`]: { affinity: -30, respect: 0, fear: 0, trust: 0, loyalty: 0 },
          ['npc-third-to-' + idaId]: { affinity: -30, respect: 0, fear: 0, trust: 0, loyalty: 0 },
        },
      }
      const result = executeAllowlistedNpcIntentions(state)
      const rel = result.relationships[`${idaId}-to-npc-third`]
      expect(rel?.affinity ?? 0).toBeGreaterThan(-30)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes challenge-authority (via npcChallengeAuthority) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('challenge-authority'))
      state = {
        ...state,
        npcRuntimeStates: [
          { ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-harbor', traits: { ...state.npcRuntimeStates[0]!.traits, dominance: 60 } },
          state.npcRuntimeStates[1]!,
        ],
      }
      const result = executeAllowlistedNpcIntentions(state)
      const changed = Object.entries(result.factionStandings).some(([id, v]) => v < (state.factionStandings[id] ?? 0))
      expect(changed).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes spy-on (via npcSpyOn) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('spy-on'))
      // spyOnHandler.canExecute requires intrigue >= 50 or curiosity >= 60.
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, skills: { ...state.npcRuntimeStates[0]!.skills, intrigue: 60 } }, state.npcRuntimeStates[1]!] }
      const result = executeAllowlistedNpcIntentions(state)
      // Marion (actor) is roster[0]; Ida is the spy target — either she learns something (memory
      // entry) or is caught (Ida's fear rises). Either way the mechanic ran.
      const actor = result.npcRuntimeStates.find((n) => n.npcId === state.npcRuntimeStates[0]!.npcId)!
      const target = result.npcRuntimeStates.find((n) => n.npcId === idaRhysRosterEntry.npcId)!
      const somethingHappened = actor.npcMemory.length > 0 || target.states.fear > idaRhysRosterEntry.states.fear
      expect(somethingHappened).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes gather-leverage (via npcGatherLeverage) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('gather-leverage'))
      const marionId = state.npcRuntimeStates[0]!.npcId
      state = {
        ...state,
        privateCorrespondence: [
          {
            id: 'msg-leverage-1',
            fromId: 'npc-other-a',
            toId: 'npc-other-b',
            sentOnDay: 1,
            deliveredOnDay: 1,
            text: 'A letter.',
            modulesUsed: [],
            sensitivity: 'compromising',
            status: 'delivered',
            authenticity: 100,
            knownBy: [],
            interceptedBy: marionId,
            consequenceApplied: false,
            isPlayerTarget: false,
          },
        ],
      }
      const result = executeAllowlistedNpcIntentions(state)
      const msg = result.privateCorrespondence.find((m) => m.id === 'msg-leverage-1')!
      expect(msg.consequenceApplied).toBe(true)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes intercept-communication (via npcInterceptCommunication) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('intercept-communication'))
      state = {
        ...state,
        privateCorrespondence: [
          {
            id: 'msg-intercept-1',
            fromId: 'npc-other-a',
            toId: 'npc-other-b',
            sentOnDay: 1,
            deliveredOnDay: 1,
            text: 'A letter.',
            modulesUsed: [],
            sensitivity: 'mundane',
            status: 'sent',
            authenticity: 100,
            knownBy: [],
            interceptedBy: null,
            consequenceApplied: false,
            isPlayerTarget: false,
          },
        ],
      }
      const result = executeAllowlistedNpcIntentions(state)
      const msg = result.privateCorrespondence.find((m) => m.id === 'msg-intercept-1')!
      expect(msg.status).toBe('intercepted')
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes people-watch (via npcPeopleWatch) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('people-watch'))
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-the-pale' }, state.npcRuntimeStates[1]!] }
      const result = executeAllowlistedNpcIntentions(state)
      const actor = result.npcRuntimeStates.find((n) => n.npcId === state.npcRuntimeStates[0]!.npcId)!
      expect(actor.npcMemory.length).toBeGreaterThan(0)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes scout-ahead (via npcScoutAhead) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('scout-ahead'))
      state = { ...state, npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-the-pale' }, state.npcRuntimeStates[1]!] }
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes investigate-threat (via npcInvestigateThreat) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('investigate-threat'))
      state = {
        ...state,
        npcRuntimeStates: [{ ...state.npcRuntimeStates[0]!, assignedDistrictId: 'district-the-pale' }, state.npcRuntimeStates[1]!],
        districtTension: { ...state.districtTension, 'district-the-pale': 50 },
      }
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes seek-shelter (via npcSeekShelter) and clears the intention afterward', () => {
      const state: GameState = stateWithMarionAndIda(makeIntention('seek-shelter'))
      const result = executeAllowlistedNpcIntentions(state)
      const actor = result.npcRuntimeStates.find((n) => n.npcId === state.npcRuntimeStates[0]!.npcId)!
      expect(actor.states.fear).toBeLessThan(state.npcRuntimeStates[0]!.states.fear)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes practice-skill (via npcPracticeSkill) and clears the intention afterward', () => {
      const state: GameState = stateWithMarionAndIda(makeIntention('practice-skill'))
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })

    it('executes train-self (via npcTrainSelf) and clears the intention afterward', () => {
      let state: GameState = stateWithMarionAndIda(makeIntention('train-self'))
      state = {
        ...state,
        house: {
          ...state.house,
          rooms: state.house.rooms.map((r, i) => (i === 0 ? { ...r, state: 'intact' as const, roomFunction: 'study' as const } : r)),
        },
      }
      const result = executeAllowlistedNpcIntentions(state)
      expect(result.npcRuntimeStates[0]!.currentIntention).toBeNull()
    })
  })
})
