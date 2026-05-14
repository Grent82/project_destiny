import { describe, it, expect } from 'vitest'
import { computeWorkingIncome } from './roster'

describe('computeWorkingIncome', () => {
  it('returns minimum 3 when all skills are zero', () => {
    expect(computeWorkingIncome({})).toBe(3)
  })

  it('scales with best non-combat skill', () => {
    expect(computeWorkingIncome({ administration: 70 })).toBe(10)
  })

  it('caps at 15 regardless of skill level', () => {
    expect(computeWorkingIncome({ negotiation: 100 })).toBe(14)
  })

  it('ignores combat skills', () => {
    expect(computeWorkingIncome({ melee: 100, ranged: 100 })).toBe(3)
  })

  it('picks the highest working skill when multiple are present', () => {
    const low = computeWorkingIncome({ administration: 21, engineering: 42 })
    const high = computeWorkingIncome({ administration: 42 })
    expect(low).toBe(high)
  })
})
