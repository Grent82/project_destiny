import { describe, it, expect, vi, afterEach } from 'vitest'
import { evaluateNpcDeparture } from './npcDeparture'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { endDay } from './endDay'

describe('evaluateNpcDeparture', () => {
  const baseNpc = { id: 'npc-1', name: 'Test', assignment: 'idle', traits: { loyalty: 10 } }
  const lowTrust = { loyalty: 15, trust: 10, fear: 20 }
  const goodRel = { loyalty: 80, trust: 70, fear: 30 }

  it('returns departed when relationship loyalty is very low and random triggers', () => {
    // loyalty=10 (<30) → multiplier 1.4 → threshold 0.14; random=0.05 < 0.14 → departure check passes
    const result = evaluateNpcDeparture(baseNpc, lowTrust, 0.05)
    expect(result.type).toBe('departed')
  })

  it('returns betrayed when trust and relationship loyalty are both very low', () => {
    // loyalty=10 (<30) → threshold 0.14; random=0.15 falls in betrayal window [0.14, 0.19)
    const result = evaluateNpcDeparture(baseNpc, lowTrust, 0.15)
    expect(result.type).toBe('betrayed')
  })

  it('returns none when relationship loyalty is healthy', () => {
    const highLoyaltyNpc = { ...baseNpc, traits: { loyalty: 80 } }
    const result = evaluateNpcDeparture(highLoyaltyNpc, goodRel, 0.05)
    expect(result.type).toBe('none')
  })

  it('returns none when assigned (not idle)', () => {
    const deployedNpc = { ...baseNpc, assignment: 'deployed' }
    const result = evaluateNpcDeparture(deployedNpc, lowTrust, 0.05)
    expect(result.type).toBe('none')
  })

  describe('loyalty trait affects departure probability', () => {
    const disloyal = { loyalty: 15, trust: 50, fear: 30 }

    it('high loyalty NPC (>70) has lower departure probability than neutral', () => {
      // neutral (loyalty=50): threshold=0.10, random=0.08 → departs (relLoyalty=15 < 25)
      const neutralNpc = { id: 'npc-2', name: 'Neutral', assignment: 'idle', traits: { loyalty: 50 } }
      const neutralResult = evaluateNpcDeparture(neutralNpc, disloyal, 0.08)
      expect(neutralResult.type).toBe('departed')

      // high loyalty (loyalty=80): threshold=0.07, random=0.08 ≥ 0.07 → no departure
      const highLoyaltyNpc = { ...neutralNpc, traits: { loyalty: 80 } }
      const highLoyaltyResult = evaluateNpcDeparture(highLoyaltyNpc, disloyal, 0.08)
      expect(highLoyaltyResult.type).toBe('none')
    })

    it('low loyalty NPC (<30) has higher departure probability than neutral', () => {
      // neutral (loyalty=50): threshold=0.10, random=0.12 ≥ 0.10 → no departure
      const neutralNpc = { id: 'npc-3', name: 'Neutral', assignment: 'idle', traits: { loyalty: 50 } }
      const neutralResult = evaluateNpcDeparture(neutralNpc, disloyal, 0.12)
      expect(neutralResult.type).toBe('none')

      // low loyalty (loyalty=10): threshold=0.14, random=0.12 < 0.14 → departs (relLoyalty=15 < 25)
      const lowLoyaltyNpc = { ...neutralNpc, traits: { loyalty: 10 } }
      const lowLoyaltyResult = evaluateNpcDeparture(lowLoyaltyNpc, disloyal, 0.12)
      expect(lowLoyaltyResult.type).toBe('departed')
    })
  })
})

describe('endDay — ambition frustration', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('high-ambition NPC without title loses 2 morale after endDay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    // Marion Vale has ambition=71, no title, assignment='working' → qualifies
    const marion = initialGameStateSnapshot.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(marion.traits.ambition).toBeGreaterThan(65)
    expect(marion.activeTitle).toBeNull()
    expect(marion.assignment).not.toBe('deployed')

    const isolatedState = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, roomAssignment: null } : npc,
      ),
    }

    const moraleBefore = isolatedState.roster.find((r) => r.npcId === 'npc-marion-vale')!.states.morale
    const next = endDay(isolatedState)
    const marionAfter = next.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(marionAfter.states.morale).toBe(Math.max(0, moraleBefore - 2))

    const logEntry = next.activityLog.find(
      (e) => e.message.includes('Marion Vale') && e.message.includes('ambition stirs without outlet'),
    )
    expect(logEntry).toBeDefined()
  })
})
