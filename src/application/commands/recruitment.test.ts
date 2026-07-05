import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
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

  it('counts only player-roster members toward capacity — world NPCs sharing the list do not consume slots (destiny-rama.6)', () => {
    // Once all NPC types share one list, a crowd of world NPCs must not exhaust the player's roster
    // capacity. rosterSlots is compared against selectRosterNpcs (playerRosterMember), not the raw list.
    const worldCrowd = []
    for (let i = 0; i < 25; i++) {
      worldCrowd.push({ ...idaRhysRosterEntry, npcId: `npc-world-${i}`, npcType: 'world' as const, playerRosterMember: false })
    }
    const crowdedState = {
      ...stateWithOffers,
      npcRuntimeStates: [...stateWithOffers.npcRuntimeStates, ...worldCrowd],
    }

    const next = recruitNpc(crowdedState, 'npc-verek-holst')

    // Recruiting still succeeds despite 25 world NPCs in the list, because only playerRosterMember counts.
    const recruited = next.npcRuntimeStates.find((r) => r.npcId === 'npc-verek-holst')
    expect(recruited).toBeDefined()
    expect(recruited?.playerRosterMember).toBe(true)
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

  it('recruits a combat-defeated enemy whose definition used to live only in the now-deleted enemy-npcs.json catalog (destiny-rama.14)', () => {
    // Before destiny-rama.14, recruitNpc only ever resolved contentCatalog.npcsById — a combat
    // "recruitable defeated enemy" hire offer (combat.ts's post-victory logic, sourced from
    // contentCatalog.enemyNpcs) for anyone other than npc-enemy-tomas-rell (the sole entry that
    // happened to also exist in npcs.json) would silently no-op here: npcDef would be undefined and
    // the whole function returns state unchanged, quietly failing the recruit even though the offer
    // existed and the player could afford it. All former enemy-npcs.json defs are merged into
    // npcs.json now, so this must succeed.
    const stateWithEnemyOffer = {
      ...stateWithOffers,
      availableForHire: [
        {
          npcId: 'npc-enemy-rack',
          discoveredInDistrictId: 'district-the-pale',
          wagePerDay: 10,
          signingBonus: 0,
          requiredFactionId: null,
          requiredFactionStanding: 0,
          turnsAvailable: 3,
          source: 'combat' as const,
        },
      ],
    }
    const next = recruitNpc(stateWithEnemyOffer, 'npc-enemy-rack')
    const recruited = next.npcRuntimeStates.find((r) => r.npcId === 'npc-enemy-rack')
    expect(recruited).toBeDefined()
    expect(recruited?.playerRosterMember).toBe(true)
    expect(next.availableForHire.find((o) => o.npcId === 'npc-enemy-rack')).toBeUndefined()
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

  it('upserts a pre-existing non-roster (world) entry instead of bailing out or duplicating it (destiny-rama.17)', () => {
    const worldEntry = {
      ...idaRhysRosterEntry,
      npcId: 'npc-verek-holst',
      npcType: 'world' as const,
      playerRosterMember: false,
      clothing: { ...idaRhysRosterEntry.clothing, torso: 'cloth-tunic-worn' },
      states: { ...idaRhysRosterEntry.states, health: 63, injury: 12 },
      npcMemory: [
        { day: 4, event: 'Scraped by in a street brawl.', eventType: 'custom' as const, visibility: 'open' as const, sentiment: 'negative' as const },
      ],
    }
    const stateWithHydratedWorldNpc = {
      ...stateWithOffers,
      npcRuntimeStates: [...stateWithOffers.npcRuntimeStates, worldEntry],
    }

    const next = recruitNpc(stateWithHydratedWorldNpc, 'npc-verek-holst')

    const matches = next.npcRuntimeStates.filter((r) => r.npcId === 'npc-verek-holst')
    expect(matches).toHaveLength(1)
    const recruited = matches[0]!
    expect(recruited.playerRosterMember).toBe(true)
    expect(recruited.clothing.torso).toBe('cloth-tunic-worn')
    expect(recruited.states.health).toBe(63)
    expect(recruited.states.injury).toBe(12)
    expect(recruited.npcMemory).toEqual(worldEntry.npcMemory)
  })

  it('does nothing when the npcId is already a player-roster member', () => {
    const alreadyRosterEntry = { ...idaRhysRosterEntry, npcId: 'npc-verek-holst', playerRosterMember: true }
    const stateWithAlreadyRostered = {
      ...stateWithOffers,
      npcRuntimeStates: [...stateWithOffers.npcRuntimeStates, alreadyRosterEntry],
    }

    const next = recruitNpc(stateWithAlreadyRostered, 'npc-verek-holst')

    expect(next).toBe(stateWithAlreadyRostered)
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

  it('upserts a pre-existing non-roster (world) entry instead of bailing out or duplicating it (destiny-rama.17)', () => {
    const worldEntry = {
      ...idaRhysRosterEntry,
      npcId: 'npc-cress-aldmoor',
      npcType: 'world' as const,
      playerRosterMember: false,
      states: { ...idaRhysRosterEntry.states, health: 71, injury: 5 },
      npcMemory: [
        { day: 2, event: 'Lost a wager at the docks.', eventType: 'custom' as const, visibility: 'open' as const, sentiment: 'negative' as const },
      ],
    }
    const stateWithHydratedWorldNpc = {
      ...stateWithOffers,
      npcRuntimeStates: [...stateWithOffers.npcRuntimeStates, worldEntry],
    }

    const next = acquireBoundHireOffer(stateWithHydratedWorldNpc, 'npc-cress-aldmoor')

    const matches = next.npcRuntimeStates.filter((entry) => entry.npcId === 'npc-cress-aldmoor')
    expect(matches).toHaveLength(1)
    const recruited = matches[0]!
    expect(recruited.playerRosterMember).toBe(true)
    expect(recruited.bondStatus?.entryReason).toBe('debt-settlement')
    expect(recruited.states.health).toBe(71)
    expect(recruited.states.injury).toBe(5)
    expect(recruited.npcMemory).toEqual(worldEntry.npcMemory)
  })

  it('does nothing when the npcId is already a player-roster member', () => {
    const alreadyRosterEntry = { ...idaRhysRosterEntry, npcId: 'npc-cress-aldmoor', playerRosterMember: true }
    const stateWithAlreadyRostered = {
      ...stateWithOffers,
      npcRuntimeStates: [...stateWithOffers.npcRuntimeStates, alreadyRosterEntry],
    }

    const next = acquireBoundHireOffer(stateWithAlreadyRostered, 'npc-cress-aldmoor')

    expect(next).toBe(stateWithAlreadyRostered)
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

  it('disbands a group when the dismissed NPC was its leader (destiny-nid0)', () => {
    const stateWithGroup = {
      ...stateWithRoster,
      npcGroups: [
        { groupId: 'group-1', leaderId: 'npc-marion-vale', memberIds: ['npc-ida-rhys'], purpose: 'circle' as const, districtId: null, formedOnDay: 1 },
      ],
    }
    const next = dismissNpc(stateWithGroup, 'npc-marion-vale')
    expect(next.npcGroups.find((g) => g.groupId === 'group-1')).toBeUndefined()
  })

  it('removes the dismissed NPC from memberIds without disbanding the group', () => {
    const stateWithGroup = {
      ...stateWithRoster,
      npcGroups: [
        { groupId: 'group-1', leaderId: 'npc-marion-vale', memberIds: ['npc-ida-rhys'], purpose: 'circle' as const, districtId: null, formedOnDay: 1 },
      ],
    }
    const next = dismissNpc(stateWithGroup, 'npc-ida-rhys')
    const group = next.npcGroups.find((g) => g.groupId === 'group-1')
    expect(group).toBeDefined()
    expect(group?.memberIds).not.toContain('npc-ida-rhys')
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
