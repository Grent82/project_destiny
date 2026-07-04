import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../../content/contentCatalog'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { adjustCityDial } from '../economicConsequences'
import { TRAIT_DOMINANT, TRAIT_MODERATE } from '../../../domain/npc/traitThresholds'
import type { InitiativeAction } from './types'

/** Initiative agency module: arc-initiator NPCs take weekly strategic actions. */
export function applyInitiativeAgency(state: GameState, rng: Rng): GameState {
  const initiatorNpcs = state.npcRuntimeStates.filter(
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
      const districtIds = contentCatalog.districts.map((d: { id: string }) => d.id)
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
      const others = next.npcRuntimeStates.filter((r) => r.npcId !== npc.npcId)
      if (others.length > 0) {
        const other = others[Math.floor(rng() * others.length)]!
        const relKey = buildRelationshipKey(npc.npcId, other.npcId)
        const existing = next.relationships[relKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
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
      const factionIds = contentCatalog.factions.map((f: { id: string }) => f.id)
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
      next = adjustCityDial(next, 'prosperity', 1)
      next = appendActivityLogEntry(next, 'economy', `${npc.name} located an underused asset and redirected it. ${amount} marks added.`)
    }

    const updatedNpc = { ...npc, npcArc: { ...arc, stageFlags: updatedFlags } }
    next = { ...next, npcRuntimeStates: next.npcRuntimeStates.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)) }
  }

  return next
}

function evaluateInitiativeAction(npc: { traits: { ambition: number; dominance: number } }, rng: Rng): InitiativeAction {
  const pool: InitiativeAction[] = ['resource_move', 'npc_approach', 'resource_move']
  if (npc.traits.ambition > TRAIT_DOMINANT) pool.push('district_lever', 'faction_position')
  if (npc.traits.dominance > TRAIT_MODERATE) pool.push('faction_position', 'district_lever')
  return pool[Math.floor(rng() * pool.length)] as InitiativeAction
}
