import type { GameState } from '../../domain'
import type { RumorClimate } from '../../domain/districts/contracts'
import type { Rumor } from '../../domain/rumors/contracts'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { getRelationship } from '../../domain/relationships/contracts'

const CLIMATE_MULTIPLIER: Record<RumorClimate, number> = {
  dry: 0.6,
  moderate: 1.0,
  saturated: 1.4,
}

// TTL in days per climate (measured from lastSpreadDay)
const CLIMATE_TTL: Record<RumorClimate, number> = {
  dry: 4,
  moderate: 6,
  saturated: 8,
}

// Hard caps
const MAX_ACTIVE_CITYWIDE = 24
const MAX_PER_DISTRICT = 4
const MAX_PER_BOND = 2

const HEAT_DECAY_PER_DAY = 12
const HEAT_GAIN_BASE = 8

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function bondId(npcIds: readonly string[]): string {
  return [...npcIds].sort().join('::')
}

function getClimate(districtId: string): RumorClimate {
  return contentCatalog.districtsById.get(districtId)?.rumorClimate ?? 'moderate'
}

/**
 * Spawn authored rumour templates as active rumours on the first day they are eligible.
 * A template is only instantiated once (keyed by templateId).
 */
function spawnAuthoredRumors(state: GameState): GameState {
  const templates = contentCatalog.rumors
  const activeTemplateIds = new Set(state.rumors.map((r) => r.templateId).filter(Boolean))

  const toAdd: Rumor[] = templates
    .filter((t) => !activeTemplateIds.has(t.id))
    .map((t) => ({
      id: `${t.id}-d${state.day}`,
      kind: t.kind,
      source: 'authored' as const,
      districtId: t.districtId,
      originNpcId: t.originNpcId,
      templateId: t.id,
      text: t.text,
      subjectNpcIds: t.subjectNpcIds,
      truth: t.truth,
      credibility: t.credibility,
      heat: 35,
      createdDay: state.day,
      lastSpreadDay: state.day,
    }))

  if (toAdd.length === 0) return state
  return { ...state, rumors: [...state.rumors, ...toAdd] }
}

/**
 * Compute spread pass chance for a rumour in a given district.
 * Uses average NPC stats from the roster as a proxy carrier (destiny-c3sh will deepen this).
 */
function computePassChance(rumor: Rumor, state: GameState): number {
  const climate = getClimate(rumor.districtId)
  const multiplier = CLIMATE_MULTIPLIER[climate]

  // Use average roster stats as carrier proxy until destiny-c3sh provides per-NPC iteration
  const roster = state.roster
  if (roster.length === 0) {
    return clamp(0.08 * multiplier + 0.30 * (rumor.credibility / 100), 0.02, 0.85)
  }

  // dominance lives on traits; trust/loyalty on per-NPC relationships
  const avgDominance =
    roster.reduce((sum, npc) => sum + (npc.traits?.dominance ?? 50), 0) / roster.length

  // Trust toward origin NPC (if known); fall back to 50 if no relationship exists
  const avgTrust =
    roster.reduce((sum, npc) => {
      const rel = rumor.originNpcId
        ? getRelationship(state.relationships, npc.npcId, rumor.originNpcId)
        : null
      return sum + (rel?.trust ?? 50)
    }, 0) / roster.length

  // Loyalty toward any subject NPC (suppress spreading harmful info about allies)
  const subjectLoyaltySum = rumor.subjectNpcIds.reduce((total, subjectId) => {
    const avgForSubject =
      roster.reduce((sum, npc) => sum + (getRelationship(state.relationships, npc.npcId, subjectId).loyalty ?? 50), 0) /
      roster.length
    return total + avgForSubject
  }, 0)
  const subjectLoyalty = subjectLoyaltySum / rumor.subjectNpcIds.length

  return clamp(
    0.08 * multiplier +
      0.30 * (rumor.credibility / 100) +
      0.18 * ((avgTrust - 50) / 50) +
      0.18 * ((avgDominance - 50) / 50) -
      0.22 * (subjectLoyalty / 100),
    0.02,
    0.85,
  )
}

/**
 * Spread existing rumours, decay heat, return updated rumour list.
 * Returns both pre-decay (for visibility promotion) and post-decay arrays.
 */
function spreadAndDecay(
  rumors: Rumor[],
  state: GameState,
  rng: Rng,
): { afterSpread: Rumor[]; afterDecay: Rumor[] } {
  const afterSpread = rumors.map((rumor) => {
    const climate = getClimate(rumor.districtId)
    const multiplier = CLIMATE_MULTIPLIER[climate]
    const passChance = computePassChance(rumor, state)
    const passed = rng() < passChance
    const heatGain = passed ? Math.round(HEAT_GAIN_BASE * multiplier) : 0
    const newHeat = clamp(rumor.heat + heatGain, 0, 100)
    const newLastSpread = passed ? state.day : rumor.lastSpreadDay
    return { ...rumor, heat: newHeat, lastSpreadDay: newLastSpread }
  })

  const afterDecay = afterSpread.map((rumor) => ({
    ...rumor,
    heat: clamp(rumor.heat - HEAT_DECAY_PER_DAY, 0, 100),
  }))

  return { afterSpread, afterDecay }
}

/**
 * Update bondVisibility based on bond-kind rumour heat thresholds.
 * Visibility only moves upward: hidden → rumored → known.
 */
function updateBondVisibility(
  bondVisibility: GameState['bondVisibility'],
  rumors: Rumor[],
): GameState['bondVisibility'] {
  const VISIBILITY_ORDER = ['hidden', 'rumored', 'known'] as const
  const updated = { ...bondVisibility }

  for (const rumor of rumors) {
    if (rumor.kind !== 'bond') continue
    const id = bondId(rumor.subjectNpcIds)
    const current = updated[id] ?? 'hidden'
    const currentIdx = VISIBILITY_ORDER.indexOf(current)

    let newIdx = currentIdx
    if (rumor.heat >= 60) newIdx = Math.max(currentIdx, 2)
    else if (rumor.heat >= 20) newIdx = Math.max(currentIdx, 1)

    if (newIdx !== currentIdx) {
      updated[id] = VISIBILITY_ORDER[newIdx]!
    }
  }

  return updated
}

/**
 * Prune expired or dead rumours, then enforce hard caps.
 */
function pruneRumors(rumors: Rumor[], currentDay: number): Rumor[] {
  // Remove dead rumours
  let alive = rumors.filter((r) => {
    if (r.heat <= 0) return false
    const climate = getClimate(r.districtId)
    const ttl = CLIMATE_TTL[climate]
    if (currentDay - r.lastSpreadDay > ttl) return false
    return true
  })

  // Sort by heat descending so we keep the hottest when capping
  alive = alive.sort((a, b) => b.heat - a.heat)

  // Enforce max 2 per bond
  const bondCounts = new Map<string, number>()
  alive = alive.filter((r) => {
    if (r.kind !== 'bond') return true
    const id = bondId(r.subjectNpcIds)
    const count = bondCounts.get(id) ?? 0
    if (count >= MAX_PER_BOND) return false
    bondCounts.set(id, count + 1)
    return true
  })

  // Enforce max per district
  const districtCounts = new Map<string, number>()
  alive = alive.filter((r) => {
    const count = districtCounts.get(r.districtId) ?? 0
    if (count >= MAX_PER_DISTRICT) return false
    districtCounts.set(r.districtId, count + 1)
    return true
  })

  // Enforce citywide cap
  return alive.slice(0, MAX_ACTIVE_CITYWIDE)
}

/**
 * Main entry point — called once per endDay tick.
 * 1. Spawn authored templates (day 1 only)
 * 2. Spread + decay all active rumours
 * 3. Update bondVisibility
 * 4. Prune expired / over-cap rumours
 */
export function applyRumorSpread(state: GameState, rng: Rng): GameState {
  let next = spawnAuthoredRumors(state)
  const { afterSpread, afterDecay } = spreadAndDecay(next.rumors, next, rng)
  // Bond visibility promotes based on spread heat (before decay) — captures momentum
  const newBondVisibility = updateBondVisibility(next.bondVisibility, afterSpread)
  const pruned = pruneRumors(afterDecay, next.day)

  return { ...next, rumors: pruned, bondVisibility: newBondVisibility }
}
