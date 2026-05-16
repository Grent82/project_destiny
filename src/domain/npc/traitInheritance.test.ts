import { describe, it, expect } from 'vitest'
import {
  calculateInheritedTraits,
  calculateInheritedAttributes,
  buildInheritedSkills,
} from './traitInheritance'
import type { Traits, Attributes } from './contracts'

const deterministicRng = (fixedValue: number) => () => fixedValue

const traitA: Traits = {
  discipline: 70, ambition: 50, empathy: 40, ruthlessness: 30,
  prudence: 60, curiosity: 55, dominance: 45, loyalty: 65, vanity: 20, zeal: 35,
}

const traitB: Traits = {
  discipline: 80, ambition: 60, empathy: 50, ruthlessness: 40,
  prudence: 70, curiosity: 65, dominance: 55, loyalty: 75, vanity: 30, zeal: 45,
}

const attrA: Attributes = {
  might: 50, agility: 45, endurance: 55, intellect: 60, perception: 50, presence: 40, resolve: 65,
}

const attrB: Attributes = {
  might: 60, agility: 55, endurance: 65, intellect: 70, perception: 60, presence: 50, resolve: 75,
}

describe('calculateInheritedTraits', () => {
  it('produces midpoint values with zero variance (rng=0.5)', () => {
    // rng()=0.5 → variance = 0.5*30-15 = 0
    const rng = deterministicRng(0.5)
    const result = calculateInheritedTraits([traitA, traitB], null, false, rng)
    expect(result.discipline).toBe(75) // midpoint of 70+80
    expect(result.empathy).toBe(45)    // midpoint of 40+50
  })

  it('clamps results to [0, 100]', () => {
    const highTrait: Traits = { ...traitA, discipline: 100 }
    const rng = deterministicRng(1) // max variance: 30-15=+15
    const result = calculateInheritedTraits([highTrait], null, false, rng)
    expect(result.discipline).toBeLessThanOrEqual(100)
  })

  it('applies combat apprenticeship modifiers', () => {
    const rng = deterministicRng(0.5) // zero variance
    const result = calculateInheritedTraits([traitA], 'combat', false, rng)
    // discipline base=70, combat+15 → 85
    expect(result.discipline).toBe(85)
    // ruthlessness base=30, combat+10 → 40
    expect(result.ruthlessness).toBe(40)
  })

  it('applies criminal apprenticeship with loyalty penalty', () => {
    const rng = deterministicRng(0.5)
    const result = calculateInheritedTraits([traitA], 'criminal', false, rng)
    // loyalty base=65, criminal-10 → 55
    expect(result.loyalty).toBe(55)
    // ruthlessness base=30, criminal+10 → 40
    expect(result.ruthlessness).toBe(40)
  })

  it('applies civic apprenticeship modifiers', () => {
    const rng = deterministicRng(0.5)
    const result = calculateInheritedTraits([traitA], 'civic', false, rng)
    expect(result.zeal).toBe(50) // 35 + 15
    expect(result.discipline).toBe(80) // 70 + 10
  })

  it('applies raised-in-house loyalty bonus', () => {
    const rng = deterministicRng(0.5)
    const withBonus = calculateInheritedTraits([traitA], null, true, rng)
    const without = calculateInheritedTraits([traitA], null, false, rng)
    expect(withBonus.loyalty).toBe(without.loyalty + 10)
  })

  it('raised-in-house loyalty capped at 100', () => {
    const maxLoyalty: Traits = { ...traitA, loyalty: 95 }
    const rng = deterministicRng(0.5)
    const result = calculateInheritedTraits([maxLoyalty], null, true, rng)
    expect(result.loyalty).toBe(100)
  })

  it('uses default midpoint of 40 with no parents', () => {
    const rng = deterministicRng(0.5) // zero variance
    const result = calculateInheritedTraits([], null, false, rng)
    expect(result.discipline).toBe(40)
    expect(result.loyalty).toBe(40)
  })

  it('variance is within ±15 range', () => {
    // Max positive variance: rng()=1 → 30-15=+15
    const maxRng = deterministicRng(1)
    const maxResult = calculateInheritedTraits([traitA], null, false, maxRng)
    // Min positive variance: rng()=0 → 0-15=-15
    const minRng = deterministicRng(0)
    const minResult = calculateInheritedTraits([traitA], null, false, minRng)

    for (const key of Object.keys(traitA) as (keyof Traits)[]) {
      expect(maxResult[key] - minResult[key]).toBeLessThanOrEqual(30)
    }
  })

  it('is deterministic with same rng seed', () => {
    let calls = 0
    const seeded = () => {
      // simple LCG for testing determinism
      calls++
      return (calls * 0.137) % 1
    }
    const r1 = calculateInheritedTraits([traitA, traitB], 'trade', true, seeded)
    calls = 0
    const r2 = calculateInheritedTraits([traitA, traitB], 'trade', true, seeded)
    // Same call sequence → same results
    expect(r1).toEqual(r2)
  })

  it('handles two parents: validated Marion × Doyle empathy midpoint', () => {
    // Marion emp=43, Doyle emp=50 → midpoint 46.5, range 31-62 before env
    const marionTraits: Traits = { ...traitA, empathy: 43 }
    const doyleTraits: Traits = { ...traitB, empathy: 50 }
    const rng = deterministicRng(0.5) // zero variance
    const result = calculateInheritedTraits([marionTraits, doyleTraits], null, false, rng)
    expect(result.empathy).toBe(47) // round(46.5)
  })

  it('handles two parents: validated Ida × Holst discipline midpoint', () => {
    // Ida disc=74, Holst disc=78 → midpoint 76
    const idaTraits: Traits = { ...traitA, discipline: 74 }
    const holstTraits: Traits = { ...traitB, discipline: 78 }
    const rng = deterministicRng(0.5)
    const result = calculateInheritedTraits([idaTraits, holstTraits], null, false, rng)
    expect(result.discipline).toBe(76)
  })
})

describe('calculateInheritedAttributes', () => {
  it('produces midpoint with zero variance (rng=0.5)', () => {
    // rng()=0.5 → variance = 0.5*15-7.5 = 0
    const rng = deterministicRng(0.5)
    const result = calculateInheritedAttributes([attrA, attrB], rng)
    expect(result.might).toBe(55) // midpoint 50+60
    expect(result.intellect).toBe(65) // midpoint 60+70
  })

  it('clamps to [30, 80]', () => {
    const lowAttr: Attributes = { ...attrA, might: 30 }
    const rng = deterministicRng(0) // max negative variance: -7.5
    const result = calculateInheritedAttributes([lowAttr], rng)
    expect(result.might).toBeGreaterThanOrEqual(30)

    const highAttr: Attributes = { ...attrA, might: 80 }
    const rng2 = deterministicRng(1) // max positive variance: +7.5
    const result2 = calculateInheritedAttributes([highAttr], rng2)
    expect(result2.might).toBeLessThanOrEqual(80)
  })

  it('defaults to midpoint 40 with no parents', () => {
    const rng = deterministicRng(0.5)
    const result = calculateInheritedAttributes([], rng)
    expect(result.might).toBe(40)
  })
})

describe('buildInheritedSkills', () => {
  it('returns baseline 10 for all skills with no apprenticeship', () => {
    const skills = buildInheritedSkills(null)
    expect(skills['melee']).toBe(10)
    expect(skills['academics']).toBe(10)
  })

  it('combat apprenticeship boosts melee and ranged', () => {
    const skills = buildInheritedSkills('combat')
    expect(skills['melee']).toBe(25)
    expect(skills['ranged']).toBe(20)
    expect(skills['academics']).toBe(10) // unaffected
  })

  it('scholarly apprenticeship boosts academics and administration', () => {
    const skills = buildInheritedSkills('scholarly')
    expect(skills['academics']).toBe(25)
    expect(skills['administration']).toBe(15)
  })

  it('criminal apprenticeship boosts intrigue and security', () => {
    const skills = buildInheritedSkills('criminal')
    expect(skills['intrigue']).toBe(25)
    expect(skills['security']).toBe(15)
  })

  it('unknown apprenticeship falls back to all baseline 10', () => {
    const skills = buildInheritedSkills('unknown-domain')
    expect(skills['melee']).toBe(10)
    expect(skills['intrigue']).toBe(10)
  })
})
