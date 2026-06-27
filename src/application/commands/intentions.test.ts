import { describe, expect, it } from 'vitest'
import {
  calculateNpcIntention,
  processNpcIntentions,
  clearNpcIntention,
  executeNpcIntention,
  executeAllNpcIntentions,
} from './intentions'
import type { GameState, NpcRuntimeState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { NPC_IDS } from '../content/ids'

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
})
