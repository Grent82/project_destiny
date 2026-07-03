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
import type { GameState, NpcRuntimeState, NpcIntentionType } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'
import { idaRhysRosterEntry } from './testFixtures'

describe('intentions', () => {
  const createTestState = (overrides: Partial<GameState> = {}): GameState => ({
    ...initialGameStateSnapshot,
    roster: [
      {
        ...initialGameStateSnapshot.roster[0]!,
        factionRelationships: [],
        currentIntention: null,
      },
    ],
    ...overrides,
  })

  describe('calculateNpcIntention', () => {
    it('returns null for NPC with player assignment', () => {
      const state = createTestState({
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            factionRelationships: [],
            currentIntention: null,
            // Boost traits to ensure an intention is generated
            traits: {
              ...initialGameStateSnapshot.roster[0]!.traits,
              ambition: 75,
              discipline: 65,
            },
            attributes: {
              ...initialGameStateSnapshot.roster[0]!.attributes,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: intention,
            states: {
              ...initialGameStateSnapshot.roster[0]!.states,
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
        roster: [],
      }
      const result = executeAllNpcIntentions(state)

      expect(result.roster).toHaveLength(0)
    })

    it('skips NPCs without intentions', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
          },
        ],
      }
      const result = executeAllNpcIntentions(state)

      expect(result.roster[0]!.currentIntention).toBeNull()
    })
  })

  describe('processNpcIntentions', () => {
    it('assigns intentions to idle NPCs', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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

      const npc = result.roster[0]!
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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

      expect(result.roster[0]!.currentIntention).toBe(existingIntention)
    })

    it('skips NPCs with active directive', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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

      expect(result.roster[0]!.currentIntention).toBeNull()
    })

    it('handles empty roster', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        roster: [],
      }
      const result = processNpcIntentions(state)

      expect(result.roster).toHaveLength(0)
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            currentIntention: existingIntention,
            factionRelationships: [],
          },
        ],
      }
      const result = clearNpcIntention(state, state.roster[0]!.npcId)

      expect(result.roster[0]!.currentIntention).toBeNull()
    })

    it('returns state unchanged for NPC without intention', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            currentIntention: null,
            factionRelationships: [],
          },
        ],
      }
      const result = clearNpcIntention(state, state.roster[0]!.npcId)

      expect(result.roster[0]!.currentIntention).toBeNull()
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
        ...initialGameStateSnapshot.roster[0]!,
        assignment: 'idle',
        currentDirectiveId: null,
        currentIntention: intention,
        states: {
          ...initialGameStateSnapshot.roster[0]!.states,
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
        ...initialGameStateSnapshot.roster[0]!,
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
        ...initialGameStateSnapshot.roster[0]!,
        assignment: 'deployed',
        currentDirectiveId: null,
        currentIntention: intention,
        states: {
          ...initialGameStateSnapshot.roster[0]!.states,
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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            states: {
              ...initialGameStateSnapshot.roster[0]!.states,
              hunger: 80, // pushes a strong state-driven (survival) candidate that outranks visit-lover/spend-time-with
            },
          },
        ],
      })

      // Sanity check: this state really does produce a non-allowlisted intention via the real pipeline.
      const natural = calculateNpcIntention(state, NPC_IDS.MARION_VALE)
      expect(natural).not.toBeNull()
      expect(WIRED_INTENTION_TYPES.has(natural!.type)).toBe(false)

      const result = processAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.currentIntention).toBeNull()
    })

    it('never assigns a currentIntention outside the wired allowlist, across a varied roster', () => {
      const state = createTestState({
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: null,
            factionRelationships: [],
            traits: {
              ...initialGameStateSnapshot.roster[0]!.traits,
              ambition: 75,
              discipline: 65,
              empathy: 70,
              loyalty: 70,
            },
            attributes: {
              ...initialGameStateSnapshot.roster[0]!.attributes,
              presence: 70,
            },
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)
      const assigned = result.roster[0]!.currentIntention

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
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            assignment: 'idle',
            currentDirectiveId: null,
            currentIntention: existing,
            factionRelationships: [],
          },
        ],
      })

      const result = processAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.currentIntention).toEqual(existing)
    })
  })

  describe('executeAllowlistedNpcIntentions (destiny-mbju)', () => {
    function stateWithMarionAndIda(marionIntention: NpcRuntimeState['currentIntention']) {
      return {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
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
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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

      expect(result.roster[0]!.currentIntention).toEqual(intention)
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
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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
        roster: [
          { ...state.roster[0]!, attributes: { ...state.roster[0]!.attributes, presence: 60 }, traits: { ...state.roster[0]!.traits, empathy: 60 } },
          state.roster[1]!,
        ],
      }
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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
        roster: [...stateWithMarionAndIda(intention).roster, cress],
      }
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      const marionId = state.roster[0]!.npcId
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
      expect(result.roster[0]!.currentIntention).toBeNull()
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
        roster: [
          { ...state.roster[0]!, traits: { ...state.roster[0]!.traits, dominance: 60 } },
          state.roster[1]!,
        ],
      }
      const marionId = state.roster[0]!.npcId
      const idaId = idaRhysRosterEntry.npcId

      const result = executeAllowlistedNpcIntentions(state)

      // Success is RNG-gated internally — assert the mechanic ran (either affinity rose on
      // success or Ida's anger rose on failure) and the intention resolved either way.
      const abAffinity = result.relationships[`${marionId}-to-${idaId}`]?.affinity ?? 0
      const idaAnger = result.roster.find((n) => n.npcId === idaId)!.states.anger
      const somethingHappened = abAffinity > 0 || idaAnger > idaRhysRosterEntry.states.anger
      expect(somethingHappened).toBe(true)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      state = { ...state, roster: [{ ...state.roster[0]!, states: { ...state.roster[0]!.states, hunger: 60 } }, state.roster[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.hunger).toBeLessThan(60)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
        roster: [
          { ...state.roster[0]!, states: { ...state.roster[0]!.states, hunger: 50, intoxication: 40 } },
          state.roster[1]!,
        ],
      }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.intoxication).toBeLessThan(40)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      state = { ...state, roster: [{ ...state.roster[0]!, states: { ...state.roster[0]!.states, fatigue: 80 } }, state.roster[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.fatigue).toBeLessThan(80)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      state = { ...state, roster: [{ ...state.roster[0]!, states: { ...state.roster[0]!.states, fatigue: 50 } }, state.roster[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.fatigue).toBeLessThan(50)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      state = { ...state, roster: [{ ...state.roster[0]!, states: { ...state.roster[0]!.states, hygiene: 70 } }, state.roster[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.hygiene).toBeLessThan(70)
      expect(result.roster[0]!.currentIntention).toBeNull()
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
      state = { ...state, roster: [{ ...state.roster[0]!, states: { ...state.roster[0]!.states, stress: 70 } }, state.roster[1]!] }

      const result = executeAllowlistedNpcIntentions(state)

      expect(result.roster[0]!.states.stress).toBeLessThan(70)
      expect(result.roster[0]!.currentIntention).toBeNull()
    })
  })
})
