import { describe, it, expect } from 'vitest'
import { evaluateNpcDeparture } from './npcDeparture'

describe('evaluateNpcDeparture', () => {
  const baseNpc = { id: 'npc-1', name: 'Test', assignment: 'idle', traits: { loyalty: 10 } }
  const lowTrust = { loyalty: 15, trust: 10, fear: 20 }
  const goodRel = { loyalty: 80, trust: 70, fear: 30 }

  it('returns departed when loyalty is very low and random triggers', () => {
    const result = evaluateNpcDeparture(baseNpc, lowTrust, 0.05)
    expect(result.type).toBe('departed')
  })

  it('returns betrayed when trust and loyalty are both very low', () => {
    const result = evaluateNpcDeparture(baseNpc, lowTrust, 0.10)
    expect(result.type).toBe('betrayed')
  })

  it('returns none when loyalty is healthy', () => {
    const highLoyaltyNpc = { ...baseNpc, traits: { loyalty: 80 } }
    const result = evaluateNpcDeparture(highLoyaltyNpc, goodRel, 0.05)
    expect(result.type).toBe('none')
  })

  it('returns none when assigned (not idle)', () => {
    const deployedNpc = { ...baseNpc, assignment: 'deployed' }
    const result = evaluateNpcDeparture(deployedNpc, lowTrust, 0.05)
    expect(result.type).toBe('none')
  })
})
