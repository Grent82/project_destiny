import { describe, it, expect } from 'vitest'
import { applyNpcConsequences } from './applyNpcConsequences'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

const noop = () => 0

function stateWithRelationship(
  npcId: string,
  trust: number,
  loyalty: number,
  base = initialStateWithIda,
) {
  const key = buildRelationshipKey('player', npcId)
  return {
    ...base,
    relationships: {
      ...base.relationships,
      [key]: { trust, loyalty, affinity: 0, respect: 0, fear: 0 },
    },
  }
}

describe('checkRelationshipMilestones (via applyNpcConsequences)', () => {
  // Note: passive drift lowers trust by 1 each day, so tests use threshold + 2 to ensure
  // the value stays at or above threshold after drift runs before the milestone check.

  it('fires event-marion-milestone-motivation when Marion trust reaches 65', () => {
    const state = stateWithRelationship('npc-marion-vale', 67, 0)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-marion-milestone-motivation')).toBe(true)
  })

  it('does not fire Marion milestone when trust is below 65', () => {
    const state = stateWithRelationship('npc-marion-vale', 64, 0)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-marion-milestone-motivation')).toBe(false)
  })

  it('does not fire Marion milestone if already fired (lastFiredDay contains key)', () => {
    const state = stateWithRelationship('npc-marion-vale', 65, 0)
    const stateWithFired = {
      ...state,
      lastFiredDay: { 'rel-milestone-npc-marion-vale-trust-65': 3 },
    }
    const result = applyNpcConsequences(stateWithFired, stateWithFired.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-marion-milestone-motivation')).toBe(false)
  })

  it('fires event-ida-milestone-contact and adds Dara Slink hire offer when Ida loyalty >= 70', () => {
    const state = stateWithRelationship('npc-ida-rhys', 0, 70)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-ida-milestone-contact')).toBe(true)
    expect(result.availableForHire.some((o) => o.npcId === 'npc-dara-slink')).toBe(true)
  })

  it('does not add Dara Slink hire offer if she is already on the roster', () => {
    const state = stateWithRelationship('npc-ida-rhys', 0, 70)
    const daraOnRoster = {
      ...state,
      roster: [
        ...state.roster,
        { ...state.roster[0]!, npcId: 'npc-dara-slink', name: 'Dara Slink' },
      ],
    }
    const result = applyNpcConsequences(daraOnRoster, daraOnRoster.relationships, noop)
    expect(result.availableForHire.filter((o) => o.npcId === 'npc-dara-slink')).toHaveLength(0)
  })

  it('does not add Dara Slink hire offer if she is already in availableForHire', () => {
    const state = stateWithRelationship('npc-ida-rhys', 0, 70)
    const existingOffer = {
      npcId: 'npc-dara-slink',
      discoveredInDistrictId: 'district-the-below',
      wagePerDay: 10,
      signingBonus: 0,
      requiredFactionId: null,
      requiredFactionStanding: 0,
      turnsAvailable: 5,
      source: 'district' as const,
    }
    const stateWithOffer = { ...state, availableForHire: [...state.availableForHire, existingOffer] }
    const result = applyNpcConsequences(stateWithOffer, stateWithOffer.relationships, noop)
    expect(result.availableForHire.filter((o) => o.npcId === 'npc-dara-slink')).toHaveLength(1)
  })

  it('fires event-doyle-milestone-holst when Doyle trust reaches 60', () => {
    const state = stateWithRelationship('npc-garet-doyle', 62, 0)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-doyle-milestone-holst')).toBe(true)
  })

  it('fires event-vael-milestone-network when Vael trust reaches 55', () => {
    const state = stateWithRelationship('npc-sister-vael', 57, 0)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.pendingEvents.some((e) => e.eventId === 'event-vael-milestone-network')).toBe(true)
  })

  it('records milestone key in lastFiredDay', () => {
    const state = stateWithRelationship('npc-sister-vael', 57, 0)
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect('rel-milestone-npc-sister-vael-trust-55' in result.lastFiredDay).toBe(true)
  })

  it('fires the milestone on the correct day', () => {
    const state = { ...stateWithRelationship('npc-marion-vale', 67, 0), day: 7 }
    const result = applyNpcConsequences(state, state.relationships, noop)
    expect(result.lastFiredDay['rel-milestone-npc-marion-vale-trust-65']).toBe(7)
  })
})
