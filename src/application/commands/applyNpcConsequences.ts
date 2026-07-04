import type { GameState, HireOffer } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { applyPassiveDrift, applyProximityGains } from './adjustRelationship'
import { evaluateNpcDeparture } from './npcDeparture'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { TRAIT_HIGH } from '../../domain/npc/traitThresholds'
import type { Rng } from './seededRng'
import { ensureCaptivityPregnancyDiscovery } from './captivityPregnancyDiscovery'
import { DISTRICT_IDS, EVENT_IDS, NPC_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

interface RelationshipMilestone {
  readonly npcId: string
  readonly axis: 'trust' | 'loyalty'
  readonly threshold: number
  readonly eventId: string
  readonly hireOffer?: HireOffer
}

const RELATIONSHIP_MILESTONES: readonly RelationshipMilestone[] = [
  {
    npcId: NPC_IDS.MARION_VALE,
    axis: 'trust',
    threshold: 65,
    eventId: EVENT_IDS.MARION_MILESTONE_MOTIVATION,
  },
  {
    npcId: NPC_IDS.IDA_RHYS,
    axis: 'loyalty',
    threshold: 70,
    eventId: EVENT_IDS.IDA_MILESTONE_CONTACT,
    hireOffer: {
      npcId: NPC_IDS.DARA_SLINK,
      discoveredInDistrictId: DISTRICT_IDS.THE_BELOW,
      wagePerDay: 10,
      signingBonus: 0,
      requiredFactionId: null,
      requiredFactionStanding: 0,
      turnsAvailable: 12,
      source: 'relationship',
    },
  },
  {
    npcId: NPC_IDS.GARET_DOYLE,
    axis: 'trust',
    threshold: 60,
    eventId: EVENT_IDS.DOYLE_MILESTONE_HOLST,
  },
  {
    npcId: NPC_IDS.SISTER_VAEL,
    axis: 'trust',
    threshold: 55,
    eventId: EVENT_IDS.VAEL_MILESTONE_NETWORK,
  },
]

function milestoneKey(npcId: string, axis: string, threshold: number): string {
  return `rel-milestone-${npcId}-${axis}-${threshold}`
}

function checkRelationshipMilestones(state: GameState): GameState {
  let next = state
  for (const milestone of RELATIONSHIP_MILESTONES) {
    const key = milestoneKey(milestone.npcId, milestone.axis, milestone.threshold)
    if (key in next.lastFiredDay) continue

    const rel = getRelationship(next.relationships, 'player', milestone.npcId)
    const value = rel[milestone.axis]
    if (value < milestone.threshold) continue

    next = enqueueTemplateEvent(
      {
        ...next,
        lastFiredDay: {
          ...next.lastFiredDay,
          [key]: next.day,
        },
      },
      milestone.eventId,
      { firedOnDay: next.day },
    )

    if (milestone.hireOffer) {
      const alreadyAvailable = next.availableForHire.some((o) => o.npcId === milestone.hireOffer!.npcId)
      const alreadyOnRoster = next.npcRuntimeStates.some((r) => r.npcId === milestone.hireOffer!.npcId)
      if (!alreadyAvailable && !alreadyOnRoster) {
        next = { ...next, availableForHire: [...next.availableForHire, milestone.hireOffer] }
      }
    }

    next = appendActivityLogEntry(
      next,
      'system',
      `Relationship milestone reached with ${milestone.npcId}.`,
    )
  }
  return ensureCaptivityPregnancyDiscovery(next)
}

/** Steps 5b–5d: relationship drift, ambition frustration, NPC departure/betrayal, durability warnings.
 *  Receives the original start-of-day relationships to correctly evaluate departure risk. */
export function applyNpcConsequences(
  state: GameState,
  startOfDayRelationships: GameState['relationships'],
  rng: Rng = Math.random,
): GameState {
  let next = state

  // Step 5b: Passive relationship drift and proximity gains
  next = applyPassiveDrift(next)
  const deployedNpcIds = next.npcRuntimeStates.filter((r) => r.assignment === 'deployed').map((r) => r.npcId)
  if (deployedNpcIds.length > 0) {
    next = applyProximityGains(next, deployedNpcIds)
  }

  // Step 5b-post: Relationship milestone unlock check
  next = checkRelationshipMilestones(next)

  // Step 5c-pre: Ambition frustration morale drain
  for (const npc of next.npcRuntimeStates) {
    if (npc.traits.ambition > TRAIT_HIGH && npc.activeTitle === null && npc.assignment !== 'deployed') {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, morale: Math.max(0, r.states.morale - 2) } }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name}: ambition stirs without outlet. Morale suffers.`,
      )
    }
  }

  // Step 5c: NPC departure / betrayal check (after wages and passive drift)
  // Use start-of-day relationships: newly-created entries from wage payment have
  // loyalty=0 by default, which would incorrectly flag new NPCs for departure.
  const rosterBeforeDepartures = next.npcRuntimeStates
  for (const npc of rosterBeforeDepartures) {
    const captivityStatus = npc.captivityState?.status
    if (captivityStatus === 'captive' || captivityStatus === 'missing') continue
    if (npc.assignment === 'recovering' || npc.assignment === 'assigned_title') continue
    const relKey = buildRelationshipKey('player', npc.npcId)
    const rel = startOfDayRelationships[relKey]
    const result = evaluateNpcDeparture(
      { id: npc.npcId, name: npc.name, assignment: npc.assignment, traits: { loyalty: npc.traits.loyalty } },
      rel,
      rng(),
    )
    if (result.type === 'departed') {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.filter((r) => r.npcId !== npc.npcId),
        availableForHire: next.availableForHire.filter((o) => o.npcId !== npc.npcId),
      }
      next = appendActivityLogEntry(next, 'system', `${result.npcName}: ${result.reason}`)
    } else if (result.type === 'betrayed') {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.filter((r) => r.npcId !== npc.npcId),
      }
      // Leak info to rivals — boost a hostile faction's standing
      const hostieFactions = Object.entries(next.factionStandings)
        .filter(([, s]) => s < -20)
        .map(([id]) => id)
      if (hostieFactions.length > 0) {
        const target = hostieFactions[0]!
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [target]: Math.min(100, (next.factionStandings[target] ?? 0) + 10),
          },
        }
      }
      next = appendActivityLogEntry(next, 'system', `${result.npcName}: ${result.consequence}`)
      next = enqueueTemplateEvent(next, EVENT_IDS.NPC_BETRAYAL, { firedOnDay: next.day })
    }
  }

  // Step 5d: Durability warnings
  for (const npc of next.npcRuntimeStates) {
    const npcDur = next.equippedItemDurabilities[npc.npcId]
    if (!npcDur) continue

    if (npc.loadout.primaryWeaponId) {
      const weaponDur = npcDur['weapon'] ?? 100
      if (weaponDur === 0) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s weapon is broken and needs repair.`)
      } else if (weaponDur <= 20) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s weapon needs repair.`)
      }
    }

    if (npc.loadout.armorId) {
      const armorDur = npcDur['armor'] ?? 100
      if (armorDur === 0) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s armor is broken and needs repair.`)
      } else if (armorDur <= 20) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s armor needs repair.`)
      }
    }
  }

  return next
}
