import { describe, it, expect } from 'vitest'
import type { CombatantState } from '../../domain'
import { computeAttackAccuracy, computeAttackDamageRange } from './combatResolution'

function makeCombatant(overrides: Partial<CombatantState> = {}): CombatantState {
  return {
    combatantId: 'combatant-test',
    sourceNpcId: null,
    name: 'Test Combatant',
    side: 'allies',
    maxHealth: 20,
    health: 20,
    morale: 100,
    skill: 50,
    accuracy: 60,
    damageMin: 5,
    damageMax: 8,
    effectiveRange: 'medium',
    soak: 0,
    speed: 10,
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: null,
    equippedArmorId: null,
    ...overrides,
  }
}

describe('computeAttackAccuracy', () => {
  it('matches the exact formula attack() rolls against for an equipped actor vs. armored target at medium range', () => {
    const actor = makeCombatant({ accuracy: 60, equippedWeaponId: 'weapon-dagger-wasterunner' })
    const target = makeCombatant({ equippedArmorId: 'armor-light-tallow-work-coat' })

    // weaponAccuracyModifier = 72 - 60 = 12; rangeOffset (medium) = -8; evasionPenalty = 2
    // 60 + 12 - 8 - 2 = 62
    expect(computeAttackAccuracy(actor, target, 'medium')).toBe(62)
  })

  it('changes with range because the weapon range modifier changes', () => {
    const actor = makeCombatant({ accuracy: 60, equippedWeaponId: 'weapon-dagger-wasterunner' })
    const target = makeCombatant({ equippedArmorId: 'armor-light-tallow-work-coat' })

    // close: rangeModifierClose = +10 -> 60 + 12 + 10 - 2 = 80
    expect(computeAttackAccuracy(actor, target, 'close')).toBe(80)
    // distant: rangeModifierDistant = -20 -> 60 + 12 - 20 - 2 = 50
    expect(computeAttackAccuracy(actor, target, 'distant')).toBe(50)
  })

  it('clamps to the 1-99 band', () => {
    const weakActor = makeCombatant({ accuracy: 1 })
    const armoredTarget = makeCombatant({ equippedArmorId: 'armor-medium-compact-chainmail' })
    expect(computeAttackAccuracy(weakActor, armoredTarget, 'distant')).toBeGreaterThanOrEqual(1)

    const strongActor = makeCombatant({ accuracy: 99, equippedWeaponId: 'weapon-dagger-wasterunner' })
    const unarmoredTarget = makeCombatant()
    expect(computeAttackAccuracy(strongActor, unarmoredTarget, 'close')).toBeLessThanOrEqual(99)
  })
})

describe('computeAttackDamageRange', () => {
  it('matches the exact pre-crit bounds attack() rolls within for an unguarded target', () => {
    const actor = makeCombatant({ damageMin: 5, damageMax: 8, equippedWeaponId: 'weapon-dagger-wasterunner' })
    const target = makeCombatant({ equippedArmorId: 'armor-light-tallow-work-coat', guarding: false })

    // effectiveDamageMin = 5 + (3-1) = 7; effectiveDamageMax = 8 + (6-3) = 11
    // soak(2) - armorPiercing(4) = -2 -> clamped to 0; guardMitigation = 1
    expect(computeAttackDamageRange(actor, target)).toEqual({ min: 7, max: 11 })
  })

  it('applies the 30% guard mitigation when the target is guarding', () => {
    const actor = makeCombatant({ damageMin: 5, damageMax: 8, equippedWeaponId: 'weapon-dagger-wasterunner' })
    const target = makeCombatant({ equippedArmorId: 'armor-light-tallow-work-coat', guarding: true })

    // Same bounds as above (7, 11) each * 0.7, rounded: round(4.9)=5, round(7.7)=8
    expect(computeAttackDamageRange(actor, target)).toEqual({ min: 5, max: 8 })
  })

  it('reduces damage bounds when armor soak exceeds weapon armor-piercing', () => {
    const actor = makeCombatant({ damageMin: 5, damageMax: 8 }) // unarmed: damageMin 1, damageMax 3 deltas
    const target = makeCombatant({ equippedArmorId: 'armor-medium-compact-chainmail' })
    const unarmored = makeCombatant()

    const armored = computeAttackDamageRange(actor, target)
    const bare = computeAttackDamageRange(actor, unarmored)
    expect(armored.min).toBeLessThanOrEqual(bare.min)
    expect(armored.max).toBeLessThanOrEqual(bare.max)
  })

  it('never returns a negative bound', () => {
    const weakActor = makeCombatant({ damageMin: 1, damageMax: 1 })
    const heavilyArmoredTarget = makeCombatant({ equippedArmorId: 'armor-medium-compact-chainmail' })
    const result = computeAttackDamageRange(weakActor, heavilyArmoredTarget)
    expect(result.min).toBeGreaterThanOrEqual(0)
    expect(result.max).toBeGreaterThanOrEqual(0)
  })
})
