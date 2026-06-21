import { describe, expect, it } from 'vitest'

import { initialStateWithIda, idaRhysRosterEntry } from '../commands/testFixtures'
import { selectBrokerageOverview } from './bondMarket'

function cloneNpc(
  npc: typeof idaRhysRosterEntry,
  npcId: string,
  name: string,
  overrides: Partial<typeof idaRhysRosterEntry> = {},
) {
  return {
    ...npc,
    npcId,
    name,
    ...overrides,
  }
}

describe('selectBrokerageOverview', () => {
  it('summarizes live bonded-labor pressure from existing bond-service rules', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...initialStateWithIda.roster[0]!,
          assignment: 'working' as const,
          roomAssignment: 'room-kitchen',
          bondStatus: {
            holderId: 'player',
            contractValue: 40,
            termDays: 30,
            entryReason: 'debt-settlement' as const,
            alongsideFreeAssignmentDays: 6,
            lastEqualityNoticeDay: null,
            forSale: false,
            lastOfferDay: null,
            marketValue: 120,
            ownerType: 'player' as const,
            bondStartDay: 1,
          },
        },
        {
          ...initialStateWithIda.roster[1]!,
          assignment: 'working' as const,
          bondStatus: null,
        },
        cloneNpc(idaRhysRosterEntry, 'npc-test-bound-1', 'Bound One', {
          bondStatus: {
            holderId: 'player',
            contractValue: 50,
            termDays: 45,
            entryReason: 'combat-capture',
            alongsideFreeAssignmentDays: 0,
            lastEqualityNoticeDay: null,
            forSale: false,
            lastOfferDay: null,
            marketValue: 140,
            ownerType: 'player',
            bondStartDay: 1,
          },
        }),
        cloneNpc(idaRhysRosterEntry, 'npc-test-free-empath', 'Free Witness', {
          bondStatus: null,
          traits: { ...idaRhysRosterEntry.traits, empathy: 71 },
        }),
        cloneNpc(idaRhysRosterEntry, 'npc-test-bound-2', 'Bound Two', {
          bondStatus: {
            holderId: 'player',
            contractValue: 35,
            termDays: 20,
            entryReason: 'voluntary',
            alongsideFreeAssignmentDays: 0,
            lastEqualityNoticeDay: null,
            forSale: false,
            lastOfferDay: null,
            marketValue: 90,
            ownerType: 'player',
            bondStartDay: 1,
          },
        }),
      ],
    }

    const overview = selectBrokerageOverview({ game: state })

    expect(overview.risks.coerciveHoldCount).toBe(2)
    expect(overview.risks.workingBoundCount).toBe(1)
    expect(overview.risks.freeWorkerCount).toBe(1)
    expect(overview.risks.empathicWitnessCount).toBe(1)
    expect(overview.risks.monthlyCostsActive).toBe(true)
    expect(overview.risks.equalityNoticeDaysRemaining).toBe(8)
    expect(overview.risks.heavyHoldActive).toBe(true)
  })

  it('shows no live service pressure when the house is not working bound contracts', () => {
    const overview = selectBrokerageOverview({ game: initialStateWithIda })

    expect(overview.risks.monthlyCostsActive).toBe(false)
    expect(overview.risks.equalityNoticeDaysRemaining).toBeNull()
    expect(overview.risks.heavyHoldActive).toBe(false)
  })

  it('derives explicit buyer quotes when a house-held contract is marked for transfer', () => {
    const state = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              bondStatus: {
                holderId: 'player' as const,
                contractValue: 40,
                termDays: 30,
                entryReason: 'debt-settlement' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: true,
                lastOfferDay: null,
                marketValue: 120,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : npc,
      ),
    }

    const overview = selectBrokerageOverview({ game: state })
    const marion = overview.houseHeld.find((entry) => entry.npcId === 'npc-marion-vale')

    expect(marion?.saleQuotes.map((quote) => `${quote.buyerName}:${quote.offerAmount}`)).toEqual([
      'Compact Registrar:102',
      'Noble House Agent:126',
      'Tallow Ring Broker:108',
      'Merchant Factor:114',
    ])
  })

  it('surfaces rescue previews for transferred contracts', () => {
    const overview = selectBrokerageOverview({ game: stateWithTransferredCompactHold() })
    const ida = overview.transferred.find((entry) => entry.npcId === 'npc-ida-rhys')

    expect(ida?.holderNote).toBe('Registrar holding - slow, legal, and watched.')
    expect(ida?.legalRescueLabel).toBe('Buy freedom (180 Marks)')
    expect(ida?.extractionLabel).toBe('Extract quietly (health -20, Ring -15)')
    expect(ida?.forceLabel).toBe('Seize by force (health -15)')
  })
})

function stateWithTransferredCompactHold() {
  return {
    ...initialStateWithIda,
    roster: initialStateWithIda.roster.map((npc) =>
      npc.npcId === 'npc-ida-rhys'
        ? {
            ...npc,
            assignment: 'transferred' as const,
            bondStatus: {
              holderId: 'buyer-compact-registrar',
              contractValue: 90,
              termDays: 60,
              entryReason: 'debt-settlement' as const,
              alongsideFreeAssignmentDays: 0,
              lastEqualityNoticeDay: null,
              forSale: false,
              lastOfferDay: null,
              marketValue: 120,
              ownerType: 'npc' as const,
              bondStartDay: 0,
            },
          }
        : npc,
    ),
    bondedPersonsRegistry: {
      'buyer-compact-registrar': ['npc-ida-rhys'],
    },
  }
}
