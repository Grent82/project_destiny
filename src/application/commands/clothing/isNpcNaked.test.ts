import { describe, it, expect } from 'vitest'
import {
  isNpcNaked,
  isNpcPartiallyClothed,
  countEquippedClothing,
  getClothingDescription,
  calculateNakednessPenalty,
} from './isNpcNaked'
import { idaRhysRosterEntry } from '../testFixtures'

describe('isNpcNaked', () => {
  it('returns true when no clothing is equipped', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(isNpcNaked(nakedNpc)).toBe(true)
  })

  it('returns false when any clothing is equipped', () => {
    const clothedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: 'cloth-shirt-burlap',
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(isNpcNaked(clothedNpc)).toBe(false)
  })

  it('returns false when undergarments are equipped', () => {
    const npcWithUndergarments = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: 'cloth-underclothes-simple',
        accessories: [],
      },
    }

    expect(isNpcNaked(npcWithUndergarments)).toBe(false)
  })
})

describe('isNpcPartiallyClothed', () => {
  it('returns false when completely naked', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(isNpcPartiallyClothed(nakedNpc)).toBe(false)
  })

  it('returns false when fully clothed', () => {
    const fullyClothedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: 'cloth-shirt-burlap',
        arms: 'cloth-sleeves-rolled',
        legs: 'cloth-trousers-burlap',
        feet: 'cloth-sandals-strapped',
        full: null,
        undergarments: 'cloth-underclothes-simple',
        accessories: [],
      },
    }

    expect(isNpcPartiallyClothed(fullyClothedNpc)).toBe(false)
  })

  it('returns true when 1-3 layers are equipped', () => {
    const partiallyClothedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: null,
        arms: null,
        legs: 'cloth-trousers-burlap',
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(isNpcPartiallyClothed(partiallyClothedNpc)).toBe(true)
  })
})

describe('countEquippedClothing', () => {
  it('returns 0 when naked', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(countEquippedClothing(nakedNpc)).toBe(0)
  })

  it('returns correct count when some items equipped', () => {
    const npc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: 'cloth-shirt-burlap',
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(countEquippedClothing(npc)).toBe(2)
  })

  it('returns 7 when fully equipped', () => {
    const fullyEquipped = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: 'cloth-shirt-burlap',
        arms: 'cloth-sleeves-rolled',
        legs: 'cloth-trousers-burlap',
        feet: 'cloth-sandals-strapped',
        full: null,
        undergarments: 'cloth-underclothes-simple',
        accessories: [],
      },
    }

    expect(countEquippedClothing(fullyEquipped)).toBe(6)
  })
})

describe('getClothingDescription', () => {
  it('returns "completely naked" when no clothing', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(getClothingDescription(nakedNpc)).toBe('completely naked')
  })

  it('returns "fully clothed" when all layers covered', () => {
    const fullyClothed = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: 'cloth-shirt-burlap',
        arms: 'cloth-sleeves-rolled',
        legs: 'cloth-trousers-burlap',
        feet: 'cloth-sandals-strapped',
        full: null,
        undergarments: 'cloth-underclothes-simple',
        accessories: [],
      },
    }

    expect(getClothingDescription(fullyClothed)).toBe('lightly clothed') // 6/7 is not "fully clothed"
  })

  it('returns "partially clothed" for 1-3 items', () => {
    const partiallyClothed = {
      ...idaRhysRosterEntry,
      clothing: {
        head: 'cloth-headscarf-ragged',
        torso: null,
        arms: null,
        legs: 'cloth-trousers-burlap',
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(getClothingDescription(partiallyClothed)).toBe('partially clothed')
  })
})

describe('calculateNakednessPenalty', () => {
  it('returns no penalty when clothed', () => {
    const clothedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: 'cloth-shirt-burlap',
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(calculateNakednessPenalty(clothedNpc, true)).toEqual({
      moraleDelta: 0,
      stressDelta: 0,
    })
  })

  it('returns severe penalty for naked in public', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(calculateNakednessPenalty(nakedNpc, true)).toEqual({
      moraleDelta: -20,
      stressDelta: 15,
    })
  })

  it('returns minor penalty for naked in private', () => {
    const nakedNpc = {
      ...idaRhysRosterEntry,
      clothing: {
        head: null,
        torso: null,
        arms: null,
        legs: null,
        feet: null,
        full: null,
        undergarments: null,
        accessories: [],
      },
    }

    expect(calculateNakednessPenalty(nakedNpc, false)).toEqual({
      moraleDelta: -2,
      stressDelta: 3,
    })
  })
})
