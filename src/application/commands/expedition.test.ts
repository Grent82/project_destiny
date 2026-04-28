import { describe, it, expect } from 'vitest'
import { generateExpeditionEncounter, rollDiscovery } from './expedition'

describe('generateExpeditionEncounter', () => {
  it('returns combat for low random with high danger', () => {
    const enc = generateExpeditionEncounter(1, 4, 0.01)
    expect(enc.type).toBe('combat')
  })

  it('returns none for high random', () => {
    const enc = generateExpeditionEncounter(1, 2, 0.99)
    expect(enc.type).toBe('none')
  })

  it('returns discovery for mid-range random', () => {
    const enc = generateExpeditionEncounter(1, 2, 0.35)
    expect(enc.type).toBe('discovery')
  })
})

describe('rollDiscovery', () => {
  const table = [
    { type: 'item', itemId: 'item-ration-compact-brick', weight: 3 },
    { type: 'marks', amount: 100, weight: 1 },
  ]

  it('returns an item for low random', () => {
    const result = rollDiscovery(table, 0.1)
    expect(result?.type).toBe('item')
  })

  it('returns marks for high random', () => {
    const result = rollDiscovery(table, 0.9)
    expect(result?.type).toBe('marks')
  })
})
