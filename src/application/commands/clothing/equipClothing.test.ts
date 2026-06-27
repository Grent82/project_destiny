import { describe, it, expect } from 'vitest'
import { equipClothing, unequipClothing } from './equipClothing'
import { initialStateWithIda } from '../testFixtures'

describe('equipClothing', () => {
  it('equips a clothing item to the correct layer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              clothing: { ...n.clothing, torso: null },
            }
          : n,
      ),
    }

    // Equip a torso clothing item (using an existing item from the catalog)
    const result = equipClothing(state, {
      npcId: 'npc-ida-rhys',
      layer: 'torso',
      itemId: 'cloth-shirt-burlap',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.torso).toBe('cloth-shirt-burlap')
    expect(result.activityLog.some((e) => e.message.includes('equips'))).toBe(true)
  })

  it('unequips current item before equipping new one', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              clothing: { ...n.clothing, torso: 'cloth-tunic-simple' },
            }
          : n,
      ),
    }

    const result = equipClothing(state, {
      npcId: 'npc-ida-rhys',
      layer: 'torso',
      itemId: 'cloth-shirt-burlap',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.torso).toBe('cloth-shirt-burlap')
  })

  it('does nothing if item is already equipped', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              clothing: { ...n.clothing, head: 'cloth-headscarf-ragged' },
            }
          : n,
      ),
    }

    const result = equipClothing(state, {
      npcId: 'npc-ida-rhys',
      layer: 'head',
      itemId: 'cloth-headscarf-ragged',
    })

    // Should return state unchanged
    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.head).toBe('cloth-headscarf-ragged')
  })

  it('returns state unchanged if NPC not found', () => {
    const result = equipClothing(initialStateWithIda, {
      npcId: 'non-existent-npc',
      layer: 'torso',
      itemId: 'cloth-shirt-burlap',
    })

    expect(result).toBe(initialStateWithIda)
  })

  it('returns state unchanged if item not in catalog', () => {
    const result = equipClothing(initialStateWithIda, {
      npcId: 'npc-ida-rhys',
      layer: 'torso',
      itemId: 'non-existent-item',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.torso).toBeNull()
  })
})

describe('unequipClothing', () => {
  it('unequips a clothing item from the correct layer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              clothing: { ...n.clothing, feet: 'cloth-sandals-strapped' },
            }
          : n,
      ),
    }

    const result = unequipClothing(state, {
      npcId: 'npc-ida-rhys',
      layer: 'feet',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.feet).toBeNull()
    expect(result.activityLog.some((e) => e.message.includes('unequips'))).toBe(true)
  })

  it('returns state unchanged if nothing equipped on layer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              clothing: { ...n.clothing, arms: null },
            }
          : n,
      ),
    }

    const result = unequipClothing(state, {
      npcId: 'npc-ida-rhys',
      layer: 'arms',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.clothing.arms).toBeNull()
  })
})
