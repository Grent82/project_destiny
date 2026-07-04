import { describe, expect, it } from 'vitest'

import type { GameState } from '../../domain'
import { initialGameStateSnapshot } from '../store/initialGameState'
import {
  applyMiraCustodyRoutine,
  getMiraExpectedRoom,
  shouldTransferOnDay,
  isMiraRescueComplete,
  isMiraCaptive,
  getMiraCustodySchedule,
} from './applyMiraCustodyRoutine'

describe('getMiraExpectedRoom', () => {
  it('returns inner-ring for days 1-3 of cycle', () => {
    expect(getMiraExpectedRoom(0)).toBe('tannery-inner-ring') // day 1
    expect(getMiraExpectedRoom(1)).toBe('tannery-inner-ring') // day 2
    expect(getMiraExpectedRoom(2)).toBe('tannery-inner-ring') // day 3
  })

  it('returns holding-floor for days 4-7 of cycle', () => {
    expect(getMiraExpectedRoom(3)).toBe('tannery-holding-floor') // day 4
    expect(getMiraExpectedRoom(4)).toBe('tannery-holding-floor') // day 5
    expect(getMiraExpectedRoom(5)).toBe('tannery-holding-floor') // day 6
    expect(getMiraExpectedRoom(6)).toBe('tannery-holding-floor') // day 7
  })

  it('cycles back to inner-ring on day 8 (new cycle)', () => {
    expect(getMiraExpectedRoom(7)).toBe('tannery-inner-ring') // day 8 = day 1 of new cycle
  })

  it('handles large timeHeldDays values correctly', () => {
    expect(getMiraExpectedRoom(20)).toBe('tannery-holding-floor') // day 21 = day 0 mod 7 -> day 7
    expect(getMiraExpectedRoom(21)).toBe('tannery-inner-ring') // day 22 = day 1 mod 7 -> day 1
  })
})

describe('shouldTransferOnDay', () => {
  it('returns true on day 1 (start of cycle)', () => {
    expect(shouldTransferOnDay(0)).toBe(true) // day 1
  })

  it('returns true on day 4 (transfer to holding-floor)', () => {
    expect(shouldTransferOnDay(3)).toBe(true) // day 4
  })

  it('returns true on day 8 (transfer back to inner-ring, new cycle)', () => {
    expect(shouldTransferOnDay(7)).toBe(true) // day 8 = day 1 of new cycle
  })

  it('returns false on non-transfer days', () => {
    expect(shouldTransferOnDay(1)).toBe(false) // day 2
    expect(shouldTransferOnDay(2)).toBe(false) // day 3
    expect(shouldTransferOnDay(4)).toBe(false) // day 5
    expect(shouldTransferOnDay(5)).toBe(false) // day 6
    expect(shouldTransferOnDay(6)).toBe(false) // day 7
  })
})

describe('isMiraRescueComplete', () => {
  it('returns false when quest-mira-rescue is not completed', () => {
    const state: Pick<GameState, 'completedQuestIds' | 'activeQuests'> = {
      ...initialGameStateSnapshot,
      completedQuestIds: [],
    }
    expect(isMiraRescueComplete(state)).toBe(false)
  })

  it('returns true when quest-mira-rescue is completed', () => {
    const state: Pick<GameState, 'completedQuestIds' | 'activeQuests'> = {
      ...initialGameStateSnapshot,
      completedQuestIds: ['quest-mira-rescue'],
    }
    expect(isMiraRescueComplete(state)).toBe(true)
  })
})

describe('isMiraCaptive', () => {
  it('returns false for undefined captivity', () => {
    expect(isMiraCaptive(undefined)).toBe(false)
  })

  it('returns true for captive status', () => {
    expect(isMiraCaptive({ status: 'captive' } as never)).toBe(true)
  })

  it('returns true for missing status', () => {
    expect(isMiraCaptive({ status: 'missing' } as never)).toBe(true)
  })

  it('returns false for returned status', () => {
    expect(isMiraCaptive({ status: 'returned' } as never)).toBe(false)
  })
})

describe('applyMiraCustodyRoutine', () => {
  function createMiraState(overrides: Partial<{
    day: number
    timeHeldDays: number
    roomId: string
    condition: 'healthy' | 'hurt' | 'broken' | 'altered'
    compliance: 'resistant' | 'conflicted' | 'compliant'
    bondType: 'none' | 'fear' | 'dependency' | 'affection' | 'coercion'
    lastTransferDay: number | null
  }> = {}): GameState {
    return {
      ...initialGameStateSnapshot,
      day: overrides.day ?? 1,
      npcCaptivityStates: {
        'npc-mira': {
          status: 'captive',
          holderId: 'faction-gilded-court',
          siteId: 'site-poi-pale-old-tannery',
          roomId: overrides.roomId ?? 'tannery-inner-ring',
          regime: 'guarded',
          condition: overrides.condition ?? 'hurt',
          compliance: overrides.compliance ?? 'resistant',
          bondType: overrides.bondType ?? 'fear',
          timeHeldDays: overrides.timeHeldDays ?? 0,
          lastTransferDay: overrides.lastTransferDay ?? null,
          questTag: 'quest-mira-rescue',
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] }
        },
      },
    }
  }

  it('increments timeHeldDays by one', () => {
    const state = createMiraState({ timeHeldDays: 5 })
    const next = applyMiraCustodyRoutine(state, () => 0)

    expect(next.npcCaptivityStates['npc-mira']?.timeHeldDays).toBe(6)
  })

  it('updates roomId on transfer days', () => {
    // Day 4: transfer from inner-ring to holding-floor
    const state = createMiraState({ timeHeldDays: 2, roomId: 'tannery-inner-ring' })
    const next = applyMiraCustodyRoutine(state, () => 0)

    expect(next.npcCaptivityStates['npc-mira']?.roomId).toBe('tannery-holding-floor')
    expect(next.npcCaptivityStates['npc-mira']?.lastTransferDay).toBe(state.day)
  })

  it('updates roomId back to inner-ring on day 8 (new cycle)', () => {
    // Day 8: transfer from holding-floor back to inner-ring
    const state = createMiraState({ timeHeldDays: 6, roomId: 'tannery-holding-floor' })
    const next = applyMiraCustodyRoutine(state, () => 0)

    expect(next.npcCaptivityStates['npc-mira']?.roomId).toBe('tannery-inner-ring')
  })

  it('does not change room on non-transfer days', () => {
    const state = createMiraState({ timeHeldDays: 1, roomId: 'tannery-inner-ring' })
    const next = applyMiraCustodyRoutine(state, () => 0)

    expect(next.npcCaptivityStates['npc-mira']?.roomId).toBe('tannery-inner-ring')
    expect(next.npcCaptivityStates['npc-mira']?.lastTransferDay).toBeNull()
  })

  it('stops routine when rescue quest is completed', () => {
    const state = createMiraState({ timeHeldDays: 5 })
    const completedState: GameState = {
      ...state,
      completedQuestIds: ['quest-mira-rescue'],
    }
    const next = applyMiraCustodyRoutine(completedState, () => 0)

    // State should not change when rescue is complete
    expect(next.npcCaptivityStates['npc-mira']?.timeHeldDays).toBe(5)
  })

  it('stops routine when Mira is freed', () => {
    const state = createMiraState({ timeHeldDays: 5 })
    const freedState: GameState = {
      ...state,
      npcCaptivityStates: {
        'npc-mira': {
          ...state.npcCaptivityStates['npc-mira']!,
          status: 'returned',
        },
      },
    }
    const next = applyMiraCustodyRoutine(freedState, () => 0)

    expect(next.npcCaptivityStates['npc-mira']?.timeHeldDays).toBe(5)
  })

  it('does nothing when Mira captivity state does not exist', () => {
    const state = createMiraState()
    const noMiraState: GameState = {
      ...state,
      npcCaptivityStates: {},
    }
    const next = applyMiraCustodyRoutine(noMiraState, () => 0)

    expect(next.npcCaptivityStates['npc-mira']).toBeUndefined()
  })

  it('applies condition worsening after 5 days with high probability', () => {
    const state = createMiraState({ timeHeldDays: 4, condition: 'hurt' })
    // Use deterministic RNG that triggers the 0.6 threshold
    const next = applyMiraCustodyRoutine(state, () => 0.5)

    // At day 5 (timeHeldDays 4 -> 5), condition should worsen from hurt to broken
    expect(next.npcCaptivityStates['npc-mira']?.condition).toBe('broken')
  })

  it('does not worsen condition below altered', () => {
    // Day 25 (timeHeldDays=24 -> 25) is a degradation day (25 % 5 === 0)
    // Start at 'altered' and verify it stays at 'altered' even on a degradation day
    const state = createMiraState({ timeHeldDays: 24, condition: 'altered' })
    const next = applyMiraCustodyRoutine(state, () => 0)

    // altered is the max condition, should stay at altered
    expect(next.npcCaptivityStates['npc-mira']?.condition).toBe('altered')
  })

  it('applies compliance shift after 7 days', () => {
    const state = createMiraState({ timeHeldDays: 6, compliance: 'resistant' })
    const next = applyMiraCustodyRoutine(state, () => 0.3) // Below 0.4 threshold

    expect(next.npcCaptivityStates['npc-mira']?.compliance).toBe('conflicted')
  })

  it('applies bondType shift after 10 days', () => {
    const state = createMiraState({ timeHeldDays: 9, bondType: 'fear' })
    const next = applyMiraCustodyRoutine(state, () => 0.3) // Below 0.35 threshold

    expect(next.npcCaptivityStates['npc-mira']?.bondType).toBe('dependency')
  })

  it('does not progress bondType when RNG is above threshold', () => {
    // Day 20 (timeHeldDays=19 -> 20) is a bond drift day (20 % 10 === 0)
    // bondType can progress to affection, but only if RNG < 0.35
    const state = createMiraState({ timeHeldDays: 19, bondType: 'dependency' })
    const next = applyMiraCustodyRoutine(state, () => 0.5) // Above threshold, should not change

    expect(next.npcCaptivityStates['npc-mira']?.bondType).toBe('dependency')
  })

  it('progresses to affection when RNG allows', () => {
    // Day 20 (timeHeldDays=19 -> 20) is a bond drift day
    const state = createMiraState({ timeHeldDays: 19, bondType: 'dependency' })
    const next = applyMiraCustodyRoutine(state, () => 0.2) // Above 0.35 threshold, should progress

    expect(next.npcCaptivityStates['npc-mira']?.bondType).toBe('affection')
  })

  it('runs deterministically with same RNG seed', () => {
    const state = createMiraState({ timeHeldDays: 0, condition: 'healthy' })

    const next1 = applyMiraCustodyRoutine(state, () => 0.5)
    const next2 = applyMiraCustodyRoutine(state, () => 0.5)

    expect(next1.npcCaptivityStates['npc-mira']).toEqual(next2.npcCaptivityStates['npc-mira'])
  })
})

describe('getMiraCustodySchedule', () => {
  function createScheduleState(overrides: Partial<{
    day: number
    timeHeldDays: number
    roomId: string
    lastTransferDay: number | null
  }> = {}): Pick<GameState, 'npcCaptivityStates' | 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests' | 'day'> {
    return {
      day: overrides.day ?? 1,
      completedQuestIds: [],
      activeQuests: [],
      npcRuntimeStates: [],
      npcCaptivityStates: {
        'npc-mira': {
          status: 'captive',
          holderId: 'faction-gilded-court',
          siteId: 'site-poi-pale-old-tannery',
          roomId: overrides.roomId ?? 'tannery-inner-ring',
          regime: 'guarded',
          condition: 'hurt',
          compliance: 'resistant',
          bondType: 'fear',
          timeHeldDays: overrides.timeHeldDays ?? 0,
          lastTransferDay: overrides.lastTransferDay ?? null,
          questTag: 'quest-mira-rescue',
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] }
        },
      },
    }
  }

  it('returns null when Mira is not captive', () => {
    const state = createScheduleState()
    state.npcCaptivityStates['npc-mira']!.status = 'returned'

    expect(getMiraCustodySchedule(state)).toBeNull()
  })

  it('returns null when rescue is complete', () => {
    const state = createScheduleState()
    state.completedQuestIds = ['quest-mira-rescue']

    expect(getMiraCustodySchedule(state)).toBeNull()
  })

  it('returns current room and next transfer info', () => {
    const state = createScheduleState({ roomId: 'tannery-holding-floor', timeHeldDays: 3 })
    const schedule = getMiraCustodySchedule(state)

    expect(schedule).toBeTruthy()
    expect(schedule?.currentRoom).toBe('tannery-holding-floor')
    expect(schedule?.isScheduleActive).toBe(true)
  })

  it('returns correct next room based on cycle', () => {
    const state = createScheduleState({ roomId: 'tannery-inner-ring', timeHeldDays: 2 })
    const schedule = getMiraCustodySchedule(state)

    // Day 3 -> next should be holding-floor (day 4 transfer)
    expect(schedule?.nextRoom).toBe('tannery-holding-floor')
  })
})
