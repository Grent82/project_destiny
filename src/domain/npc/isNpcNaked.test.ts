import { describe, expect, it } from 'vitest'
import { isNpcNaked, hasNpcClothing, hasNpcArmor, shouldNpcReceiveNoArmorProtection } from './isNpcNaked'
import type { NpcRuntimeState } from '../npc/contracts'
import { createNpcRuntimeState } from './testFixtures'

describe('isNpcNaked', () => {
  it('returns true when NPC has no clothing or armor', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC')

    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns false when NPC has head clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: 'hat-001', torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has torso clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: 'shirt-001', arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has arms clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: 'sleeves-001', legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has legs clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: 'pants-001', feet: null, full: null, undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has feet clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: 'boots-001', full: null, undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has full-body clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: 'bodysuit-001', undergarments: null, accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has undergarments', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: 'underwear-001', accessories: [] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns true when NPC has only accessories (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: ['ring-001'] },
    })

    // Accessories alone do not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC has only light armor torso (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: 'leather-chest-001', lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })

    // Armor alone does not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC has only heavy armor torso (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: 'plate-chest-001', heavyLegs: null, shield: null },
    })

    // Armor alone does not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC has only light armor legs (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: 'leather-legs-001', heavyTorso: null, heavyLegs: null, shield: null },
    })

    // Armor alone does not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC has only heavy armor legs (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: 'plate-legs-001', shield: null },
    })

    // Armor alone does not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC has only shield (no clothing)', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: 'tower-shield-001' },
    })

    // Shield alone does not prevent nakedness
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns false when NPC has full clothing outfit', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: 'hat-001', torso: 'shirt-001', arms: 'sleeves-001', legs: 'pants-001', feet: 'boots-001', full: null, undergarments: 'underwear-001', accessories: ['ring-001'] },
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns true when NPC has full armor set but no clothing', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
      armor: { lightTorso: null, lightLegs: null, heavyTorso: 'plate-chest-001', heavyLegs: 'plate-legs-001', shield: 'tower-shield-001' },
    })

    // Full armor without clothing is still naked
    expect(isNpcNaked(npc)).toBe(true)
  })

  it('returns true when NPC only has weapon equipped', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
      equipment: { weapon: 'sword-001', armor: null, accessory: [] },
    })

    // Having a weapon doesn't mean not naked
    expect(isNpcNaked(npc)).toBe(true)
  })
})

describe('hasNpcClothing', () => {
  it('returns false when NPC has no clothing', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC')
    expect(hasNpcClothing(npc)).toBe(false)
  })

  it('returns true when NPC has any clothing item', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: 'hat-001', torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    })
    expect(hasNpcClothing(npc)).toBe(true)
  })

  it('returns true when NPC has undergarments', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: 'underwear-001', accessories: [] },
    })
    expect(hasNpcClothing(npc)).toBe(true)
  })

  it('returns false when NPC has only accessories (not clothing)', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: ['ring-001'] },
    })
    // Accessories are not considered clothing
    expect(hasNpcClothing(npc)).toBe(false)
  })
})

describe('hasNpcArmor', () => {
  it('returns false when NPC has no armor', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC')
    expect(hasNpcArmor(npc)).toBe(false)
  })

  it('returns true when NPC has light armor torso', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: 'leather-chest-001', lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })
    expect(hasNpcArmor(npc)).toBe(true)
  })

  it('returns true when NPC has heavy armor torso', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: 'plate-chest-001', heavyLegs: null, shield: null },
    })
    expect(hasNpcArmor(npc)).toBe(true)
  })

  it('returns true when NPC has shield', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: 'tower-shield-001' },
    })
    expect(hasNpcArmor(npc)).toBe(true)
  })
})

describe('shouldNpcReceiveNoArmorProtection', () => {
  it('returns true when NPC has no clothing (even with armor equipped)', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
      armor: { lightTorso: 'plate-chest-001', lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })
    // NPC has armor but no clothing -> no armor protection
    expect(shouldNpcReceiveNoArmorProtection(npc)).toBe(true)
  })

  it('returns false when NPC has any clothing', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: 'shirt-001', arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
      armor: { lightTorso: 'plate-chest-001', lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })
    expect(shouldNpcReceiveNoArmorProtection(npc)).toBe(false)
  })

  it('returns true when NPC is completely naked', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC')
    expect(shouldNpcReceiveNoArmorProtection(npc)).toBe(true)
  })

  it('returns false when NPC has undergarments', () => {
    const npc = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: 'underwear-001', accessories: [] },
    })
    expect(shouldNpcReceiveNoArmorProtection(npc)).toBe(false)
  })
})
