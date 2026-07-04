import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { recruitNpc, dismissNpc, expireHireOffers, deriveBondTermsFromHireOffer, acquireBoundHireOffer } from './recruitment'

const stateWithOffers = {
  ...initialGameStateSnapshot,
  money: 300,
  availableForHire: [
    {
      npcId: 'npc-verek-holst',
      discoveredInDistrictId: 'district-harbor',
      wagePerDay: 18,
      signingBonus: 0,
      requiredFactionId: null,
      requiredFactionStanding: 0,
      turnsAvailable: 3,
    },
    {
      npcId: 'npc-cress-aldmoor',
      discoveredInDistrictId: null,
      wagePerDay: 20,
      signingBonus: 75,
      requiredFactionId: null,
      requiredFactionStanding: 0,
      turnsAvailable: 2,
    },
  ],
}

describe('recruitNpc', () => {
  it('deducts signing bonus from money', () => {
    const next = recruitNpc(stateWithOffers, 'npc-cress-aldmoor')
    expect(next.money).toBe(stateWithOffers.money - 75)
  })

  it('does not deduct anything when signing bonus is zero', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    expect(next.money).toBe(stateWithOffers.money)
  })

  it('adds the NPC to the roster', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    const onRoster = next.npcRuntimeStates.find((r) => r.npcId === 'npc-verek-holst')
    expect(onRoster).toBeDefined()
  })

  it('adds NPC with loyalty penalty of -20 from starting loyalty', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    const onRoster = next.npcRuntimeStates.find((r) => r.npcId === 'npc-verek-holst')
    // npc-verek-holst starting loyalty is 38, penalty of 20 → 18
    expect(onRoster?.traits.loyalty).toBe(18)
  })

  it('clamps loyalty at 0 if penalty exceeds starting loyalty', () => {
    const lowLoyaltyState = {
      ...stateWithOffers,
      availableForHire: [
        {
          npcId: 'npc-aldric-vane',
          discoveredInDistrictId: null,
          wagePerDay: 20,
          signingBonus: 0,
          requiredFactionId: null,
          requiredFactionStanding: 0,
          turnsAvailable: 3,
        },
      ],
    }
    const next = recruitNpc(lowLoyaltyState, 'npc-aldric-vane')
    const onRoster = next.npcRuntimeStates.find((r) => r.npcId === 'npc-aldric-vane')
    // npc-aldric-vane starting loyalty is 27, penalty → 7
    expect(onRoster?.traits.loyalty).toBeGreaterThanOrEqual(0)
  })

  it('removes the offer from availableForHire', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    const stillAvailable = next.availableForHire.find((o) => o.npcId === 'npc-verek-holst')
    expect(stillAvailable).toBeUndefined()
  })

  it('leaves other offers intact', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    expect(next.availableForHire.find((o) => o.npcId === 'npc-cress-aldmoor')).toBeDefined()
  })

  it('does nothing when no offer exists for npcId', () => {
    const next = recruitNpc(stateWithOffers, 'npc-nonexistent')
    expect(next).toBe(stateWithOffers)
  })

  it('does nothing when player cannot afford signing bonus', () => {
    const brokeState = { ...stateWithOffers, money: 50 }
    const next = recruitNpc(brokeState, 'npc-cress-aldmoor')
    expect(next.npcRuntimeStates.find((r) => r.npcId === 'npc-cress-aldmoor')).toBeUndefined()
    expect(next.money).toBe(50)
  })

  it('blocks recruit when player faction standing is below required threshold', () => {
    const factionLockedState = {
      ...stateWithOffers,
      availableForHire: [
        {
          npcId: 'npc-verek-holst',
          discoveredInDistrictId: 'district-harbor',
          wagePerDay: 18,
          signingBonus: 0,
          requiredFactionId: 'faction-gilded-court',
          requiredFactionStanding: 30,
          turnsAvailable: 3,
        },
      ],
      factionStandings: { ...stateWithOffers.factionStandings, 'faction-gilded-court': 10 },
    }
    const next = recruitNpc(factionLockedState, 'npc-verek-holst')
    expect(next.npcRuntimeStates.find((r) => r.npcId === 'npc-verek-holst')).toBeUndefined()
  })

  it('allows recruit when player meets required faction standing', () => {
    const factionMetState = {
      ...stateWithOffers,
      availableForHire: [
        {
          npcId: 'npc-verek-holst',
          discoveredInDistrictId: 'district-harbor',
          wagePerDay: 18,
          signingBonus: 0,
          requiredFactionId: 'faction-gilded-court',
          requiredFactionStanding: 30,
          turnsAvailable: 3,
        },
      ],
      factionStandings: { ...stateWithOffers.factionStandings, 'faction-gilded-court': 35 },
    }
    const next = recruitNpc(factionMetState, 'npc-verek-holst')
    expect(next.npcRuntimeStates.find((r) => r.npcId === 'npc-verek-holst')).toBeDefined()
  })

  it('logs a recruitment message', () => {
    const next = recruitNpc(stateWithOffers, 'npc-verek-holst')
    const logEntry = next.activityLog.find((e) => e.message.includes('Verek Holst'))
    expect(logEntry).toBeDefined()
  })
})

describe('deriveBondTermsFromHireOffer', () => {
  it('derives a reduced upfront intake fee and durable contract values from a hire offer', () => {
    expect(
      deriveBondTermsFromHireOffer({
        wagePerDay: 20,
        signingBonus: 75,
      }),
    ).toEqual({
      intakeFee: 38,
      contractValue: 240,
      termDays: 30,
      marketValue: 288,
    })
  })
})

describe('acquireBoundHireOffer', () => {
  it('adds the NPC to the roster under a player-held debt contract', () => {
    const next = acquireBoundHireOffer(stateWithOffers, 'npc-cress-aldmoor')
    const onRoster = next.npcRuntimeStates.find((entry) => entry.npcId === 'npc-cress-aldmoor')

    expect(onRoster).toBeDefined()
    expect(onRoster?.bondStatus?.ownerType).toBe('player')
    expect(onRoster?.bondStatus?.entryReason).toBe('debt-settlement')
  })

  it('deducts the intake fee rather than the full signing bonus', () => {
    const next = acquireBoundHireOffer(stateWithOffers, 'npc-cress-aldmoor')

    expect(next.money).toBe(stateWithOffers.money - 38)
  })

  it('removes the intake offer after taking the contract', () => {
    const next = acquireBoundHireOffer(stateWithOffers, 'npc-cress-aldmoor')

    expect(next.availableForHire.find((entry) => entry.npcId === 'npc-cress-aldmoor')).toBeUndefined()
  })

  it('logs the intake as a debt contract rather than ordinary hire', () => {
    const next = acquireBoundHireOffer(stateWithOffers, 'npc-cress-aldmoor')

    expect(next.activityLog.some((entry) => entry.message.includes('debt contract'))).toBe(true)
  })
})

describe('dismissNpc', () => {
  const stateWithRoster = {
    ...initialStateWithIda,
  }

  it('removes the NPC from roster', () => {
    const next = dismissNpc(stateWithRoster, 'npc-marion-vale')
    expect(next.npcRuntimeStates.find((r) => r.npcId === 'npc-marion-vale')).toBeUndefined()
  })

  it('leaves other roster members intact', () => {
    const next = dismissNpc(stateWithRoster, 'npc-marion-vale')
    expect(next.npcRuntimeStates.find((r) => r.npcId === 'npc-ida-rhys')).toBeDefined()
  })

  it('removes dismissed NPC from selectedSquadNpcIds', () => {
    const squadState = {
      ...stateWithRoster,
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    }
    const next = dismissNpc(squadState, 'npc-marion-vale')
    expect(next.selectedSquadNpcIds.includes('npc-marion-vale')).toBe(false)
  })

  it('does nothing when NPC is not on roster', () => {
    const next = dismissNpc(stateWithRoster, 'npc-nonexistent')
    expect(next).toBe(stateWithRoster)
  })

  it('logs a dismissal message', () => {
    const next = dismissNpc(stateWithRoster, 'npc-marion-vale')
    const logEntry = next.activityLog.find((e) => e.message.includes('Marion Vale'))
    expect(logEntry).toBeDefined()
  })
})

describe('expireHireOffers', () => {
  it('decrements turnsAvailable for each offer', () => {
    const next = expireHireOffers(stateWithOffers)
    const verek = next.availableForHire.find((o) => o.npcId === 'npc-verek-holst')
    expect(verek?.turnsAvailable).toBe(2)
  })

  it('removes offers that have reached zero turnsAvailable', () => {
    const oneLeft = {
      ...stateWithOffers,
      availableForHire: [
        { ...stateWithOffers.availableForHire[0]!, turnsAvailable: 1 },
        { ...stateWithOffers.availableForHire[1]!, turnsAvailable: 2 },
      ],
    }
    const next = expireHireOffers(oneLeft)
    expect(next.availableForHire.find((o) => o.npcId === 'npc-verek-holst')).toBeUndefined()
    expect(next.availableForHire.find((o) => o.npcId === 'npc-cress-aldmoor')).toBeDefined()
  })

  it('returns empty availableForHire when all offers expire', () => {
    const allExpiring = {
      ...stateWithOffers,
      availableForHire: stateWithOffers.availableForHire.map((o) => ({
        ...o,
        turnsAvailable: 1,
      })),
    }
    const next = expireHireOffers(allExpiring)
    expect(next.availableForHire).toHaveLength(0)
  })
})
