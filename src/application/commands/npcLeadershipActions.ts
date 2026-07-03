import type { GameState } from '../../domain/game/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'

/**
 * NPC Leadership & Social Actions (destiny-l2ex)
 *
 * Real implementations for consolidate-power, socialize, gossip, mediate-conflict, and
 * challenge-authority. lead-group and support-group stay placeholders — no NPC group/squad
 * runtime concept exists yet for an NPC to lead or support (see the follow-up bead filed for
 * this gap alongside recruit-member/form-squad).
 */

function clampAxis(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)))
}

/** Finds a faction standing target for an NPC: their own per-NPC faction relationship first, or
 * their assigned district's controlling faction as a fallback (per-NPC relationships are empty
 * for most NPCs by default). Returns null if no faction can be resolved either way. */
function resolveFactionTarget(
  npc: GameState['roster'][number],
): { factionId: string; usesPersonalRelationship: boolean } | null {
  const personal = npc.factionRelationships[0]
  if (personal) return { factionId: personal.factionId, usesPersonalRelationship: true }

  const district = npc.assignedDistrictId ? contentCatalog.districtsById.get(npc.assignedDistrictId) : undefined
  if (district?.controllingFactionId) return { factionId: district.controllingFactionId, usesPersonalRelationship: false }

  return null
}

/** NPC works to consolidate power/influence, improving their (or the house's) faction standing. */
export function npcConsolidatePower(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = resolveFactionTarget(npc)
  if (!target) return state

  const gain = Math.max(
    1,
    Math.round(2 + (npc.attributes.presence - 50) / 20 + (npc.traits.ambition - 50) / 20 + (npc.traits.dominance - 50) / 25),
  )

  let next: GameState
  if (target.usesPersonalRelationship) {
    next = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              factionRelationships: n.factionRelationships.map((f) =>
                f.factionId === target.factionId ? { ...f, standing: clampAxis(f.standing + gain) } : f,
              ),
            }
          : n,
      ),
    }
  } else {
    next = {
      ...state,
      factionStandings: {
        ...state.factionStandings,
        [target.factionId]: clampAxis((state.factionStandings[target.factionId] ?? 0) + gain),
      },
    }
  }

  return appendActivityLogEntry(next, 'system', `${npc.name} works to consolidate influence with ${target.factionId}.`)
}

/** NPC publicly challenges an authority figure, risking faction standing for personal defiance. */
export function npcChallengeAuthority(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = resolveFactionTarget(npc)
  if (!target) return state

  const loss = Math.max(
    1,
    Math.round(2 + (npc.traits.dominance - 50) / 20 + (npc.traits.ruthlessness - 50) / 20),
  )

  let next: GameState
  if (target.usesPersonalRelationship) {
    next = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              factionRelationships: n.factionRelationships.map((f) =>
                f.factionId === target.factionId ? { ...f, standing: clampAxis(f.standing - loss) } : f,
              ),
            }
          : n,
      ),
    }
  } else {
    next = {
      ...state,
      factionStandings: {
        ...state.factionStandings,
        [target.factionId]: clampAxis((state.factionStandings[target.factionId] ?? 0) - loss),
      },
    }
  }

  next = {
    ...next,
    roster: next.roster.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, morale: Math.min(100, n.states.morale + 3) } } : n)),
  }

  return appendActivityLogEntry(next, 'system', `${npc.name} openly challenges ${target.factionId}'s authority.`)
}

/** NPC socializes with a nearby idle NPC — light affinity/trust gain, deterministic. */
export function npcSocialize(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = state.roster
    .filter((r) => r.npcId !== npcId && r.assignment === 'idle')
    .sort((a, b) => {
      const relA = getRelationship(state.relationships, npcId, a.npcId).affinity
      const relB = getRelationship(state.relationships, npcId, b.npcId).affinity
      return relB - relA
    })[0]
  if (!target) return state

  const gain = Math.max(1, Math.round(1 + (npc.attributes.presence - 50) / 25 + (npc.traits.empathy - 50) / 25))

  const key = buildRelationshipKey(npcId, target.npcId)
  const reverseKey = buildRelationshipKey(target.npcId, npcId)
  const rel = getRelationship(state.relationships, npcId, target.npcId)
  const reverseRel = getRelationship(state.relationships, target.npcId, npcId)

  const next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: { ...rel, affinity: clampAxis(rel.affinity + gain), trust: clampAxis(rel.trust + gain) },
      [reverseKey]: { ...reverseRel, affinity: clampAxis(reverseRel.affinity + gain), trust: clampAxis(reverseRel.trust + gain) },
    },
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} socializes with ${target.name}.`)
}

/** NPC gossips with a nearby idle NPC, sharing a rumor if the house knows any. */
export function npcGossip(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = state.roster
    .filter((r) => r.npcId !== npcId && r.assignment === 'idle')
    .sort((a, b) => {
      const relA = getRelationship(state.relationships, npcId, a.npcId).affinity
      const relB = getRelationship(state.relationships, npcId, b.npcId).affinity
      return relB - relA
    })[0]
  if (!target) return state

  const key = buildRelationshipKey(npcId, target.npcId)
  const reverseKey = buildRelationshipKey(target.npcId, npcId)
  const rel = getRelationship(state.relationships, npcId, target.npcId)
  const reverseRel = getRelationship(state.relationships, target.npcId, npcId)

  const next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: { ...rel, affinity: clampAxis(rel.affinity + 1) },
      [reverseKey]: { ...reverseRel, affinity: clampAxis(reverseRel.affinity + 1) },
    },
  }

  const rumorText = contentCatalog.rumors[0]?.text
  const message = rumorText
    ? `${npc.name} gossips with ${target.name}. Word is: ${rumorText}`
    : `${npc.name} gossips with ${target.name} about the day's small news.`
  return appendActivityLogEntry(next, 'system', message)
}

/** NPC mediates a conflict between the two idle roster NPCs with the worst relationship. */
export function npcMediateConflict(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const others = state.roster.filter((r) => r.npcId !== npcId && r.assignment === 'idle')
  let worstPair: { a: string; b: string; affinity: number } | null = null
  for (const a of others) {
    for (const b of others) {
      if (a.npcId >= b.npcId) continue
      const affinity = getRelationship(state.relationships, a.npcId, b.npcId).affinity
      if (affinity < 0 && (!worstPair || affinity < worstPair.affinity)) {
        worstPair = { a: a.npcId, b: b.npcId, affinity }
      }
    }
  }
  if (!worstPair) return state

  const gain = Math.max(1, Math.round(2 + (npc.traits.empathy - 50) / 20 + (npc.skills.negotiation - 50) / 20))

  const keyAB = buildRelationshipKey(worstPair.a, worstPair.b)
  const keyBA = buildRelationshipKey(worstPair.b, worstPair.a)
  const relAB = getRelationship(state.relationships, worstPair.a, worstPair.b)
  const relBA = getRelationship(state.relationships, worstPair.b, worstPair.a)

  const next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [keyAB]: { ...relAB, affinity: clampAxis(relAB.affinity + gain) },
      [keyBA]: { ...relBA, affinity: clampAxis(relBA.affinity + gain) },
    },
  }

  const nameA = others.find((n) => n.npcId === worstPair!.a)!.name
  const nameB = others.find((n) => n.npcId === worstPair!.b)!.name
  return appendActivityLogEntry(next, 'system', `${npc.name} mediates between ${nameA} and ${nameB}, easing the tension.`)
}
