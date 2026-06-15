import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'
import { MAX_NPC_MEMORY_ENTRIES } from '../../domain/npc/contracts'
import { calculateBaseCompatibility } from '../../domain/npc/compatibility'

type Axis = 'affinity' | 'respect' | 'fear' | 'trust' | 'loyalty'

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

/**
 * Write a memory entry to an NPC's npcMemory array (capped at MAX_NPC_MEMORY_ENTRIES).
 * Silently no-ops if the NPC is not in the roster.
 */
export function writeNpcMemory(
  state: GameState,
  npcId: string,
  event: string,
  participants?: string[],
  axisDelta?: Record<string, number>,
): void {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return

  const entry = { day: state.day, event, ...(participants ? { participants } : {}), ...(axisDelta ? { axisDelta } : {}) }
  const existing = state.roster[npcIndex]!.npcMemory ?? []
  const updated = [...existing, entry].slice(-MAX_NPC_MEMORY_ENTRIES)
  state.roster[npcIndex] = { ...state.roster[npcIndex]!, npcMemory: updated }
}

export function applyRelationshipDelta(
  state: GameState,
  fromId: string,
  toId: string,
  axis: Axis,
  delta: number,
): { key: string; oldValue: number; newValue: number; significant: boolean } {
  const key = buildRelationshipKey(fromId, toId)
  const existing = state.relationships[key] ?? EMPTY_AXES
  const oldValue = existing[axis]
  const newValue = Math.max(-100, Math.min(100, oldValue + delta))
  state.relationships[key] = { ...existing, [axis]: newValue }

  // Significant = crosses a threshold (every 25 points)
  const crossedThreshold =
    Math.floor(Math.abs(oldValue) / 25) !== Math.floor(Math.abs(newValue) / 25)

  // Write memory when delta is meaningful
  if (Math.abs(delta) > 5) {
    const description = `${axis} ${delta > 0 ? '+' : ''}${delta} with ${toId}`
    writeNpcMemory(state, fromId, description, [toId], { [axis]: delta })
    if (toId !== 'player' && toId !== fromId) {
      writeNpcMemory(state, toId, `${axis} ${delta > 0 ? '+' : ''}${delta} with ${fromId}`, [fromId], { [axis]: delta })
    }
  }

  return { key, oldValue, newValue, significant: crossedThreshold }
}

const DEFAULT_LOYALTY = 50

export function applyPassiveDrift(state: GameState): GameState {
  const rosterTraitsMap = new Map(state.roster.map((n) => [n.npcId, n.traits]))
  let relationships = state.relationships

  Object.keys(relationships).forEach((key) => {
    const rel = relationships[key]!

    // Only trust drifts passively; affinity persists until friction events reduce it
    const trust = rel.trust
    if (trust <= 40) return // relationship still forming — no decay yet

    // Base drift interval from trust band
    const baseInterval = trust > 80 ? 1 : trust > 60 ? 2 : 3

    // Parse NPC IDs from key (format: '{fromId}→{toId}')
    const arrowIdx = key.indexOf('→')
    if (arrowIdx === -1) return
    const fromId = key.slice(0, arrowIdx)
    const toId = key.slice(arrowIdx + '→'.length)

    // Loyalty for both parties — player and unknown NPCs default to 50
    const fromLoyalty = fromId === 'player' ? DEFAULT_LOYALTY : (rosterTraitsMap.get(fromId)?.loyalty ?? DEFAULT_LOYALTY)
    const toLoyalty = toId === 'player' ? DEFAULT_LOYALTY : (rosterTraitsMap.get(toId)?.loyalty ?? DEFAULT_LOYALTY)
    const avgLoyalty = (fromLoyalty + toLoyalty) / 2

    // Loyalty modifier: high loyalty → slower drift; low loyalty → faster drift
    const loyaltyFactor = avgLoyalty > 60 ? 0.75 : avgLoyalty < 35 ? 1.25 : 1.0

    // Compatibility modifier: natural chemistry slows drift; friction accelerates it
    const fromTraits = fromId !== 'player' ? rosterTraitsMap.get(fromId) : undefined
    const toTraits = toId !== 'player' ? rosterTraitsMap.get(toId) : undefined
    let compatFactor = 1.0
    if (fromTraits && toTraits) {
      const score = calculateBaseCompatibility(fromTraits, toTraits)
      compatFactor = score >= 15 ? 0.5 : score <= -10 ? 1.5 : 1.0
    }

    // Effective interval: higher rate factors → smaller interval (more frequent drift)
    const effectiveInterval = Math.max(1, Math.round(baseInterval / (loyaltyFactor * compatFactor)))

    if (state.day % effectiveInterval !== 0) return

    relationships = { ...relationships, [key]: { ...rel, trust: Math.max(0, trust - 1) } }
  })

  return { ...state, relationships }
}

const BASE_AFFINITY_GAIN = 2
const BASE_RESPECT_GAIN = 2

export function applyProximityGains(state: GameState, npcIds: string[]): GameState {
  const npcTraitsMap = new Map(
    state.roster
      .filter((n) => npcIds.includes(n.npcId))
      .map((n) => [n.npcId, n.traits]),
  )

  const next = state

  for (let i = 0; i < npcIds.length; i++) {
    for (let j = i + 1; j < npcIds.length; j++) {
      const idA = npcIds[i]!
      const idB = npcIds[j]!
      const traitsA = npcTraitsMap.get(idA)
      const traitsB = npcTraitsMap.get(idB)

      let compatScore = 0
      let curiosityBonus = 0

      if (traitsA && traitsB) {
        compatScore = calculateBaseCompatibility(traitsA, traitsB)
        const bothCurious = traitsA.curiosity > 55 && traitsB.curiosity > 55
        const eitherCurious = traitsA.curiosity > 55 || traitsB.curiosity > 55
        curiosityBonus = bothCurious ? 2 : eitherCurious ? 1 : 0
      }

      const gainMultiplier = 1.0 + compatScore / 50
      const gain = Math.max(BASE_AFFINITY_GAIN, Math.round(BASE_AFFINITY_GAIN * gainMultiplier)) + curiosityBonus

      applyRelationshipDelta(next, idA, idB, 'affinity', gain)
      applyRelationshipDelta(next, idB, idA, 'affinity', gain)
    }

    applyRelationshipDelta(next, 'player', npcIds[i]!, 'respect', BASE_RESPECT_GAIN)
  }

  return next
}
