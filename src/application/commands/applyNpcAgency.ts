import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta, writeNpcMemory } from './adjustRelationship'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { getJobForNpc } from '../content/jobCatalog'
import { matchQuirkToContext } from '../../domain/npc/matchQuirkToContext'
import { TRAIT_DOMINANT, TRAIT_MODERATE, TRAIT_NEUTRAL, TRAIT_LOW } from '../../domain/npc/traitThresholds'
import type { Rng } from './seededRng'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

type AgencyAction = 'rumor' | 'incident' | 'contact' | 'faction_favor' | 'npc_bond' | 'spend_marks'
type InitiativeAction = 'district_lever' | 'npc_approach' | 'faction_position' | 'resource_move'

/** Step 9a: NPC world agency — working NPCs shape the world through their actions.
 *  Always called from endDay with a seeded rng; the Math.random default is only a
 *  safety net for direct test calls that don't inject a seed. */
export function applyNpcAgency(state: GameState, rng: Rng = Math.random): GameState {
  let afterEvents = state
  const workingNpcs = afterEvents.roster.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const districtId = contentCatalog.districtNameToId.get(district)
      ?? `district-${district.toLowerCase().replace(/\s+/g, '-')}`
    const npcName = npc.name

    const isReckless = npc.traits.ruthlessness > TRAIT_DOMINANT || npc.traits.prudence < TRAIT_LOW
    const isAmbitious = npc.traits.ambition > TRAIT_DOMINANT
    const isDiplomatic = npc.traits.empathy > TRAIT_DOMINANT
    const isCharming = npc.traits.vanity > TRAIT_DOMINANT
    const isGreedy = npc.traits.ambition > TRAIT_NEUTRAL && npc.traits.discipline < TRAIT_NEUTRAL

    const pool: AgencyAction[] = ['rumor', 'rumor', 'rumor']
    if (isReckless || isAmbitious) pool.push('incident', 'incident')
    if (isDiplomatic || isCharming) pool.push('contact', 'contact', 'npc_bond')
    if (isAmbitious) pool.push('faction_favor')
    if (isGreedy) pool.push('spend_marks')

    const action = pool[Math.floor(rng() * pool.length)]!

    afterEvents = { ...afterEvents, relationships: { ...afterEvents.relationships } }

    if (action === 'rumor') {
      const rumors = contentCatalog.rumors
      const template = rumors[Math.floor(rng() * rumors.length)]!
      const snippet = template.text
      afterEvents = appendActivityLogEntry(
        afterEvents,
        'system',
        `${npcName} overheard something useful while working in ${district}. Word is: ${snippet}`,
      )
    } else if (action === 'incident') {
      const npcDef = contentCatalog.npcsById.get(npc.npcId)
      const cautionQuirk = npcDef
        ? matchQuirkToContext(npcDef, ['danger', 'hazard', 'trust', 'threat', 'conflict'])
        : null
      const tensionGain = cautionQuirk ? 1 : 3

      if (cautionQuirk) {
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} sensed trouble in ${district} early and stepped back. ${cautionQuirk.text.charAt(0).toUpperCase() + cautionQuirk.text.slice(1)}.`,
        )
        writeNpcMemory(afterEvents, npc.npcId, `Sensed trouble in ${district} and withdrew`, [districtId])
      } else {
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} got into a confrontation at ${district}. Tension is running higher there.`,
        )
        writeNpcMemory(afterEvents, npc.npcId, `Got into a confrontation in ${district}`, [districtId])
      }
      if (afterEvents.districtTension[districtId] !== undefined) {
        afterEvents = {
          ...afterEvents,
          districtTension: {
            ...afterEvents.districtTension,
            [districtId]: Math.min(100, (afterEvents.districtTension[districtId] ?? 0) + tensionGain),
          },
        }
      }
      if (isReckless) {
        const affectedFaction = contentCatalog.districtsById.get(districtId)?.controllingFactionId
        if (affectedFaction && afterEvents.factionStandings[affectedFaction] !== undefined) {
          afterEvents = {
            ...afterEvents,
            factionStandings: {
              ...afterEvents.factionStandings,
              [affectedFaction]: Math.max(-100, (afterEvents.factionStandings[affectedFaction] ?? 0) - 2),
            },
          }
        }
      }
    } else if (action === 'contact') {
      afterEvents = appendActivityLogEntry(
        afterEvents,
        'system',
        `${npcName} made a useful contact in ${district}. A new opportunity may follow.`,
      )
      writeNpcMemory(afterEvents, npc.npcId, `Made a contact in ${district}`)
    } else if (action === 'faction_favor') {
      const factionIds = contentCatalog.factions.map((f) => f.id)
      const factionId = factionIds[Math.floor(rng() * factionIds.length)]!
      const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
      const delta = 1 + Math.floor(rng() * 2)
      if (afterEvents.factionStandings[factionId] !== undefined) {
        afterEvents = {
          ...afterEvents,
          factionStandings: {
            ...afterEvents.factionStandings,
            [factionId]: Math.min(100, (afterEvents.factionStandings[factionId] ?? 0) + delta),
          },
        }
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} did a quiet favour for ${factionName} while working in ${district}. Your standing with them shifts.`,
        )
      }
    } else if (action === 'npc_bond') {
      const others = afterEvents.roster.filter((r) => r.npcId !== npc.npcId)
      if (others.length > 0) {
        const other = others[Math.floor(rng() * others.length)]!
        const relKey = buildRelationshipKey(npc.npcId, other.npcId)
        const existing = afterEvents.relationships[relKey]
        if (!existing || existing.loyalty < 30) {
          const delta = 5 + Math.floor(rng() * 10)
          applyRelationshipDelta(afterEvents, npc.npcId, other.npcId, 'loyalty', delta)
          afterEvents = appendActivityLogEntry(
            afterEvents,
            'system',
            `${npcName} and ${other.name} grew closer — shared time in the field has built some trust between them.`,
          )
        }
      }
    } else if (action === 'spend_marks') {
      const cost = 5 + Math.floor(rng() * 10)
      if (afterEvents.money >= cost) {
        afterEvents = { ...afterEvents, money: afterEvents.money - cost }
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'economy',
          `${npcName} spent ${cost} marks on personal business while working in ${district}. Deducted from house funds.`,
        )
        applyRelationshipDelta(afterEvents, 'player', npc.npcId, 'loyalty', 1)
      }
    }
  }

  return afterEvents
}

function evaluateInitiativeAction(npc: NpcRuntimeState, rng: Rng): InitiativeAction {
  const pool: InitiativeAction[] = ['resource_move', 'npc_approach', 'resource_move']
  if (npc.traits.ambition > TRAIT_DOMINANT) pool.push('district_lever', 'faction_position')
  if (npc.traits.dominance > TRAIT_MODERATE) pool.push('faction_position', 'district_lever')
  return pool[Math.floor(rng() * pool.length)] as InitiativeAction
}

/** Weekly initiative actions for NPCs with arc-initiator. */
export function applyInitiativeActions(state: GameState, rng: Rng = Math.random): GameState {
  const initiatorNpcs = state.roster.filter(
    (npc) => npc.npcArc?.arcId === 'arc-initiator' && state.day % 7 === 0,
  )
  if (initiatorNpcs.length === 0) return state

  let next = state

  for (const npc of initiatorNpcs) {
    const arc = npc.npcArc!
    const action = evaluateInitiativeAction(npc, rng)
    const initiativeKey = `initiative-${state.day}`
    const updatedFlags = { ...arc.stageFlags, [initiativeKey]: true }

    if (action === 'district_lever') {
      const districtIds = contentCatalog.districts.map((d) => d.id)
      const districtId = districtIds[Math.floor(rng() * districtIds.length)]!
      const districtName = contentCatalog.districtsById.get(districtId)?.name ?? districtId
      const delta = rng() > 0.5 ? -3 : 3
      next = {
        ...next,
        districtTension: {
          ...next.districtTension,
          [districtId]: Math.max(0, Math.min(100, (next.districtTension[districtId] ?? 0) + delta)),
        },
      }
      next = appendActivityLogEntry(next, 'system', `${npc.name} has been working a contact in ${districtName}. Tension there has ${delta < 0 ? 'eased' : 'increased'}.`)
    } else if (action === 'npc_approach') {
      const others = next.roster.filter((r) => r.npcId !== npc.npcId)
      if (others.length > 0) {
        const other = others[Math.floor(rng() * others.length)]!
        const relKey = buildRelationshipKey(npc.npcId, other.npcId)
        const existing = next.relationships[relKey] ?? { affinity: 0, trust: 0, respect: 0, fear: 0, loyalty: 0 }
        next = {
          ...next,
          relationships: {
            ...next.relationships,
            [relKey]: { ...existing, affinity: Math.min(100, existing.affinity + 3) },
          },
        }
        next = appendActivityLogEntry(next, 'system', `${npc.name} spent time with ${other.name} this week — observing, mostly. Something is being assessed.`)
      }
    } else if (action === 'faction_position') {
      const factionIds = contentCatalog.factions.map((f) => f.id)
      const factionId = factionIds[Math.floor(rng() * factionIds.length)]!
      const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
      if (next.factionStandings[factionId] !== undefined) {
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [factionId]: Math.max(-100, Math.min(100, (next.factionStandings[factionId] ?? 0) + 2)),
          },
        }
        next = appendActivityLogEntry(next, 'system', `${npc.name} has been positioning the house with ${factionName}. Your standing shifts slightly. There may be side effects.`)
      }
    } else if (action === 'resource_move') {
      const amount = 15 + Math.floor(rng() * 26)
      next = { ...next, money: next.money + amount }
      next = appendActivityLogEntry(next, 'economy', `${npc.name} located an underused asset and redirected it. ${amount} Marks added.`)
    }

    const updatedNpc = { ...npc, npcArc: { ...arc, stageFlags: updatedFlags } }
    next = { ...next, roster: next.roster.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)) }
  }

  return next
}
