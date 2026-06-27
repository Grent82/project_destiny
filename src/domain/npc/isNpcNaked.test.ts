import { describe, expect, it } from 'vitest'
import { isNpcNaked } from './isNpcNaked'
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

  it('returns false when NPC has accessories', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: ['ring-001'] },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has light armor torso', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: 'leather-chest-001', lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has heavy armor torso', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: 'plate-chest-001', heavyLegs: null, shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has light armor legs', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: 'leather-legs-001', heavyTorso: null, heavyLegs: null, shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has heavy armor legs', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: 'plate-legs-001', shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has shield', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: 'tower-shield-001' },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has full clothing outfit', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: 'hat-001', torso: 'shirt-001', arms: 'sleeves-001', legs: 'pants-001', feet: 'boots-001', full: null, undergarments: 'underwear-001', accessories: ['ring-001'] },
      armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    })

    expect(isNpcNaked(npc)).toBe(false)
  })

  it('returns false when NPC has full armor set', () => {
    const npc: NpcRuntimeState = createNpcRuntimeState('test-npc', 'Test NPC', {
      clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
      armor: { lightTorso: null, lightLegs: null, heavyTorso: 'plate-chest-001', heavyLegs: 'plate-legs-001', shield: 'tower-shield-001' },
    })

    expect(isNpcNaked(npc)).toBe(false)
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
