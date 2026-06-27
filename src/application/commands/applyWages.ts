import type { GameState, NpcStatus } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { formatMarks } from '../../domain/game/currency'
import { calculateMercenaryContractWage } from './wageRates'
import { ROOM_IDS } from '../content/ids'

export function wageForStatus(status: NpcStatus): number {
  switch (status) {
    case 'retainer':
      return 4
    case 'mercenary':
      return 8
    case 'citizen':
      return 5
    case 'servant':
      return 2
    case 'apprentice':
      return 3
    case 'noble':
      return 14
    case 'criminal':
      return 5
    case 'prisoner':
      return 0
    case 'family':
      return 0
    default:
      return 0
  }
}

function resolveRosterWagePerDay(status: NpcStatus, contractWagePerDay: number | undefined, skills: GameState['roster'][number]['skills']): number {
  if (contractWagePerDay !== undefined) return contractWagePerDay
  if (status === 'mercenary') return calculateMercenaryContractWage(skills)
  return wageForStatus(status)
}

/** Steps 1, 1b, 1c: wage deduction, loyalty decay, unrest effect on loyalty. */
export function applyWages(state: GameState): GameState {
  let next = state

  // Kitchen intact: house feeds its staff → 1 Mk reduction per NPC wage
  const kitchenIntact = next.house.rooms.some((r) => r.roomId === ROOM_IDS.KITCHEN && r.state === 'intact')
  const kitchenDiscount = kitchenIntact ? 1 : 0

  // Step 1: Wage deduction
  next = { ...next, relationships: { ...next.relationships } }
  for (const rosterEntry of state.roster) {
    if (rosterEntry.bondStatus?.holderId === 'player') continue
    const wage = resolveRosterWagePerDay(
      rosterEntry.status,
      rosterEntry.contractWagePerDay,
      rosterEntry.skills,
    )
    if (wage === 0) continue
    const effectiveWage = Math.max(0, wage - kitchenDiscount)

    if (next.money >= effectiveWage) {
      next = { ...next, money: next.money - effectiveWage }
      // Pay 50% to savings, 50% to carriedCash
      const savingsAmount = Math.floor(effectiveWage / 2)
      const cashAmount = effectiveWage - savingsAmount // Ensure total equals effectiveWage (handles odd numbers)
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === rosterEntry.npcId
            ? {
                ...r,
                personalFunds: {
                  ...r.personalFunds,
                  savings: r.personalFunds.savings + savingsAmount,
                  carriedCash: r.personalFunds.carriedCash + cashAmount,
                  lastWagePaymentDay: next.day,
                },
              }
            : r,
        ),
      }
      // Paid on time → loyalty +2
      applyRelationshipDelta(next, 'player', rosterEntry.npcId, 'loyalty', 2)
    } else {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === rosterEntry.npcId
            ? { ...r, wagesOwedDays: r.wagesOwedDays + 1 }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'economy',
        `${rosterEntry.name} draws no wages today. The debt grows.`,
      )
    }
  }

  // Step 1b: Loyalty decay for unpaid NPCs (empathy trait reduces decay rate by 15%)
  const loyaltyDecay = next.playerCharacter.traits.empathy > 60 ? 13 : 15
  for (const npc of next.roster) {
    if (npc.wagesOwedDays >= 2) {
      const newLoyalty = Math.max(0, npc.traits.loyalty - loyaltyDecay)
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, traits: { ...r.traits, loyalty: newLoyalty } }
            : r,
        ),
      }
      const relResult = applyRelationshipDelta(next, 'player', npc.npcId, 'loyalty', -5)
      if (newLoyalty < 20) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name}'s loyalty is failing. Unpaid debts leave marks on the house.`,
        )
      } else if (relResult.significant) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name} grows resentful. The unpaid debt strains their loyalty.`,
        )
      }
    }
  }

  // Step 1c: Wage arrears warnings and departure
  for (const npc of next.roster) {
    if (npc.bondStatus?.holderId === 'player') continue
    const wage = resolveRosterWagePerDay(npc.status, npc.contractWagePerDay, npc.skills)
    if (wage === 0) continue

    if (npc.wagesOwedDays >= 5 && (npc.assignment === 'working' || npc.assignment === 'assigned_title')) {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? {
                ...r,
                assignment: 'idle',
                activeTitle: r.assignment === 'assigned_title' ? null : r.activeTitle,
              }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} refuses further work until wages are settled.`,
      )
    } else if (npc.wagesOwedDays >= 14) {
      next = {
        ...next,
        roster: next.roster.filter((r) => r.npcId !== npc.npcId),
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} has gone unpaid for two weeks. They leave the house without a word.`,
      )
    } else if (npc.wagesOwedDays === 7) {
      const owed = formatMarks(npc.wagesOwedDays * wage)
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} has not been paid in a week. The house owes them ${owed}. Their patience will not last.`,
      )
    }
  }

  // Step 1e: Unrest effect on loyalty — high city unrest unsettles all roster NPCs
  if (next.cityDials.unrest >= 70) {
    next = {
      ...next,
      roster: next.roster.map((npc) => ({
        ...npc,
        traits: { ...npc.traits, loyalty: Math.max(0, npc.traits.loyalty - 1) },
      })),
    }
    next = appendActivityLogEntry(next, 'system', 'Unrest in the city unsettles your household.')
  }

  return next
}
