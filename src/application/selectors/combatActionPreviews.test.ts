import { describe, it, expect } from 'vitest'
import type { ActiveCombatState, CombatantState } from '../../domain'
import { selectCombatActionPreviews } from './combatActionPreviews'

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

function makeEncounter(overrides: Partial<ActiveCombatState> = {}, combatants: CombatantState[]): ActiveCombatState {
  return {
    encounterId: 'encounter-test',
    round: 1,
    range: 'medium',
    outcome: 'ongoing',
    activeCombatantId: 'ally-1',
    combatants,
    log: [],
    provenance: null,
    ...overrides,
  }
}

function stateWith(encounter: ActiveCombatState | null) {
  return { game: { activeCombat: encounter } } as unknown as Parameters<typeof selectCombatActionPreviews>[0]
}

describe('selectCombatActionPreviews', () => {
  it('returns an empty array when there is no active combat', () => {
    expect(selectCombatActionPreviews(stateWith(null))).toEqual([])
  })

  it('returns an empty array when it is not an ally turn', () => {
    const ally = makeCombatant({ combatantId: 'ally-1', side: 'allies' })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies', health: 10, maxHealth: 20 })
    const encounter = makeEncounter({ activeCombatantId: 'enemy-1' }, [ally, enemy])
    expect(selectCombatActionPreviews(stateWith(encounter))).toEqual([])
  })

  it('previews the attack target as the lowest-HP living opponent with expected damage and hit chance', () => {
    const ally = makeCombatant({ combatantId: 'ally-1', side: 'allies', accuracy: 60, damageMin: 5, damageMax: 8 })
    const lowHpEnemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies', name: 'Weak Enemy', health: 5, maxHealth: 20 })
    const highHpEnemy = makeCombatant({ combatantId: 'enemy-2', side: 'enemies', name: 'Strong Enemy', health: 20, maxHealth: 20 })
    const encounter = makeEncounter({}, [ally, lowHpEnemy, highHpEnemy])

    const previews = selectCombatActionPreviews(stateWith(encounter))
    const attackPreview = previews.find((p) => p.id === 'attack')!

    expect(attackPreview.wasteful).toBe(false)
    expect(attackPreview.previewLine).toContain('Weak Enemy')
    expect(attackPreview.previewLine).toContain('HP 5/20')
    expect(attackPreview.previewLine).toMatch(/Expected: \d+-\d+ damage/)
    expect(attackPreview.previewLine).not.toContain('Strong Enemy')
  })

  it('flags a low hit-chance attack with a risk line', () => {
    const ally = makeCombatant({ combatantId: 'ally-1', side: 'allies', accuracy: 1 })
    const heavilyArmoredEnemy = makeCombatant({
      combatantId: 'enemy-1',
      side: 'enemies',
      equippedArmorId: 'armor-medium-compact-chainmail',
    })
    const encounter = makeEncounter({ range: 'distant' }, [ally, heavilyArmoredEnemy])

    const attackPreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'attack')!
    expect(attackPreview.riskLine).toMatch(/⚠ Low hit chance/)
  })

  it('marks Advance as wasteful and disabled when already at close range', () => {
    const ally = makeCombatant({ combatantId: 'ally-1' })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies' })
    const encounter = makeEncounter({ range: 'close' }, [ally, enemy])

    const advancePreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'advance')!
    expect(advancePreview.wasteful).toBe(true)
    expect(advancePreview.disabledReason).toMatch(/already at closest range/i)
  })

  it('marks Retreat as wasteful and disabled when already at distant range', () => {
    const ally = makeCombatant({ combatantId: 'ally-1' })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies' })
    const encounter = makeEncounter({ range: 'distant' }, [ally, enemy])

    const retreatPreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'retreat')!
    expect(retreatPreview.wasteful).toBe(true)
    expect(retreatPreview.disabledReason).toMatch(/already at farthest range/i)
  })

  it('previews Advance as a real, non-wasteful range change with a direction arrow', () => {
    const ally = makeCombatant({ combatantId: 'ally-1' })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies' })
    const encounter = makeEncounter({ range: 'medium' }, [ally, enemy])

    const advancePreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'advance')!
    expect(advancePreview.wasteful).toBe(false)
    expect(advancePreview.previewLine).toContain('→')
    expect(advancePreview.previewLine).toContain('Close')
  })

  it('counts enemies who would gain accuracy at the new range as a risk', () => {
    // Ally unarmed (flat range modifiers). Enemy wields a weapon whose close-range modifier is
    // strongly positive relative to its medium modifier, so it genuinely favors advancing to close.
    const ally = makeCombatant({ combatantId: 'ally-1', equippedWeaponId: null })
    const closeFavoringEnemy = makeCombatant({
      combatantId: 'enemy-1',
      side: 'enemies',
      equippedWeaponId: 'weapon-dagger-wasterunner', // rangeModifierClose 10 > rangeModifierMedium -8
    })
    const encounter = makeEncounter({ range: 'medium' }, [ally, closeFavoringEnemy])

    const advancePreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'advance')!
    expect(advancePreview.riskLine).toMatch(/1 enemy favors this range/)
  })

  it('previews Guard with the real -30% mitigation and its actual expiration', () => {
    const ally = makeCombatant({ combatantId: 'ally-1', guardCooldown: false })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies' })
    const encounter = makeEncounter({}, [ally, enemy])

    const guardPreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'guard')!
    expect(guardPreview.wasteful).toBe(false)
    expect(guardPreview.previewLine).toContain('−30% damage taken')
    expect(guardPreview.previewLine).toMatch(/Expires when you act again/)
  })

  it('marks Guard as wasteful and disabled when the combatant already braced this round', () => {
    const ally = makeCombatant({ combatantId: 'ally-1', guardCooldown: true })
    const enemy = makeCombatant({ combatantId: 'enemy-1', side: 'enemies' })
    const encounter = makeEncounter({}, [ally, enemy])

    const guardPreview = selectCombatActionPreviews(stateWith(encounter)).find((p) => p.id === 'guard')!
    expect(guardPreview.wasteful).toBe(true)
    expect(guardPreview.disabledReason).toMatch(/already braced this round/i)
  })
})
