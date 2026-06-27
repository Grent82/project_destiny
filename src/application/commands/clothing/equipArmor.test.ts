import { describe, it, expect } from 'vitest'
import { equipArmor, unequipArmor } from './equipArmor'
import { initialStateWithIda } from '../testFixtures'

describe('equipArmor', () => {
  it('equips an armor item to the correct layer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              armor: { ...n.armor, lightTorso: null },
            }
          : n,
      ),
    }

    const result = equipArmor(state, {
      npcId: 'npc-ida-rhys',
      layer: 'lightTorso',
      itemId: 'armor-light-padded-vest',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.armor.lightTorso).toBe('armor-light-padded-vest')
    expect(result.activityLog.some((e) => e.message.includes('equips'))).toBe(true)
  })

  it('unequips current item before equipping new one', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              armor: { ...n.armor, lightTorso: 'armor-light-leather-jacket' },
            }
          : n,
      ),
    }

    const result = equipArmor(state, {
      npcId: 'npc-ida-rhys',
      layer: 'lightTorso',
      itemId: 'armor-light-padded-vest',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.armor.lightTorso).toBe('armor-light-padded-vest')
  })

  it('returns state unchanged if NPC not found', () => {
    const result = equipArmor(initialStateWithIda, {
      npcId: 'non-existent-npc',
      layer: 'lightTorso',
      itemId: 'armor-light-padded-vest',
    })

    expect(result).toBe(initialStateWithIda)
  })
})

describe('unequipArmor', () => {
  it('unequips an armor item from the correct layer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((n) =>
        n.npcId === 'npc-ida-rhys'
          ? {
              ...n,
              armor: { ...n.armor, shield: 'armor-shield-wood-round' },
            }
          : n,
      ),
    }

    const result = unequipArmor(state, {
      npcId: 'npc-ida-rhys',
      layer: 'shield',
    })

    const ida = result.roster.find((n) => n.npcId === 'npc-ida-rhys')!
    expect(ida.armor.shield).toBeNull()
    expect(result.activityLog.some((e) => e.message.includes('unequips'))).toBe(true)
  })
})
