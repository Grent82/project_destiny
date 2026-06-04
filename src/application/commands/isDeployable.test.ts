import { describe, expect, it } from 'vitest'

import { idaRhysRosterEntry } from './testFixtures'
import { isDeployable } from './isDeployable'
import { MIN_DEPLOYABLE_HEALTH } from './combatConsts'

const baseNpc = idaRhysRosterEntry

describe('isDeployable', () => {
  it('returns true for an idle npc with sufficient health', () => {
    const npc = { ...baseNpc, assignment: 'idle' as const, states: { ...baseNpc.states, health: MIN_DEPLOYABLE_HEALTH } }
    expect(isDeployable(npc)).toBe(true)
  })

  it('returns false for a working npc', () => {
    const npc = { ...baseNpc, assignment: 'working' as const }
    expect(isDeployable(npc)).toBe(false)
  })

  it('returns false for a training npc', () => {
    const npc = { ...baseNpc, assignment: 'training' as const }
    expect(isDeployable(npc)).toBe(false)
  })

  it('returns false for a recovering npc', () => {
    const npc = { ...baseNpc, assignment: 'recovering' as const }
    expect(isDeployable(npc)).toBe(false)
  })

  it('returns false for a npc assigned to a title', () => {
    const npc = { ...baseNpc, assignment: 'assigned_title' as const }
    expect(isDeployable(npc)).toBe(false)
  })

  it('returns false for a transferred npc', () => {
    const npc = { ...baseNpc, assignment: 'transferred' as const }
    expect(isDeployable(npc)).toBe(false)
  })

  it('returns false for a npc below minimum deployable health', () => {
    const npc = { ...baseNpc, assignment: 'idle' as const, states: { ...baseNpc.states, health: MIN_DEPLOYABLE_HEALTH - 1 } }
    expect(isDeployable(npc)).toBe(false)
  })
})
