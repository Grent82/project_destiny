import type { GameState } from '../../domain'
import type { RumorClimate } from '../../domain/districts/contracts'
import type { Rumor } from '../../domain/rumors/contracts'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { getRelationship } from '../../domain/relationships/contracts'
import { addQuestLeadIfNew } from './questLifecycle'

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
    .filter((t) => t.autoSpawn !== false && !activeTemplateIds.has(t.id))
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
 * Resolve the effective district for a roster NPC.
 * At-home assignments (idle/training/recovering/assigned_title) → house home district.
 * Out assignments (working/deployed/defense) → explicit assignedDistrictId, then NPC definition home.
 */
function effectiveDistrictId(npc: GameState['roster'][number], houseDistrictId: string): string | null {
  const atHome = ['idle', 'training', 'recovering', 'assigned_title'] as const
  if ((atHome as readonly string[]).includes(npc.assignment)) return houseDistrictId
  return npc.assignedDistrictId ?? contentCatalog.npcsById.get(npc.npcId)?.districtId ?? null
}

/**
 * Compute spread pass chance for a rumour in a given district.
 * Only roster NPCs assigned to the rumour's district contribute social stats.
 * NPCs in other districts are ignored — district presence is a player-controlled variable.
 */
function computePassChance(rumor: Rumor, state: GameState): number {
  const climate = getClimate(rumor.districtId)
  const multiplier = CLIMATE_MULTIPLIER[climate]
  const base = 0.08 * multiplier + 0.30 * (rumor.credibility / 100)

  // Filter to NPCs whose effective district matches this rumour's district
  const districtRoster = state.roster.filter(
    (npc) => effectiveDistrictId(npc, state.houseDistrictId) === rumor.districtId,
  )

  if (districtRoster.length === 0) {
    // No presence in this district — only base credibility/climate drives spread
    return clamp(base, 0.02, 0.85)
  }

  // dominance lives on traits
  const avgDominance =
    districtRoster.reduce((sum, npc) => sum + (npc.traits?.dominance ?? 50), 0) / districtRoster.length

  // Trust toward origin NPC (if known); fall back to 50 if no relationship exists
  const avgTrust =
    districtRoster.reduce((sum, npc) => {
      const rel = rumor.originNpcId
        ? getRelationship(state.relationships, npc.npcId, rumor.originNpcId)
        : null
      return sum + (rel?.trust ?? 50)
    }, 0) / districtRoster.length

  // Loyalty toward subject NPCs suppresses spreading harmful information about allies
  const subjectLoyaltySum = rumor.subjectNpcIds.reduce((total, subjectId) => {
    const avgForSubject =
      districtRoster.reduce(
        (sum, npc) => sum + (getRelationship(state.relationships, npc.npcId, subjectId).loyalty ?? 50),
        0,
      ) / districtRoster.length
    return total + avgForSubject
  }, 0)
  const subjectLoyalty = rumor.subjectNpcIds.length > 0
    ? subjectLoyaltySum / rumor.subjectNpcIds.length
    : 50

  return clamp(
    base +
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
 * Check if any rumor crossed its template's heatThreshold this tick.
 * On first crossing, add the linked quest lead to availableQuestLeads.
 * Mutates the passed state (availableQuestLeads + activityLog).
 */
function applyRumorConsequences(state: GameState, preSpread: Rumor[], afterSpread: Rumor[]): void {
  const templates = contentCatalog.rumors
  for (const after of afterSpread) {
    if (!after.templateId) continue
    const template = templates.find((t) => t.id === after.templateId)
    if (!template?.consequences) continue

    const { heatThreshold, unlocksQuestId } = template.consequences
    const before = preSpread.find((r) => r.id === after.id)
    const heatBefore = before?.heat ?? 0

    if (heatBefore < heatThreshold && after.heat >= heatThreshold) {
      addQuestLeadIfNew(state, unlocksQuestId)
    }
  }
}

/**
 * Main entry point — called once per endDay tick.
 * 1. Spawn authored templates (day 1 only)
 * 2. Spread + decay all active rumours
 * 3. Update bondVisibility
 * 4. Check consequence triggers (rumor heat → quest lead)
 * 5. Prune expired / over-cap rumours
 */
export function applyRumorSpread(state: GameState, rng: Rng): GameState {
  const next = spawnAuthoredRumors(state)
  const preSpread = next.rumors
  const { afterSpread, afterDecay } = spreadAndDecay(preSpread, next, rng)
  const newBondVisibility = updateBondVisibility(next.bondVisibility, afterSpread)
  const pruned = pruneRumors(afterDecay, next.day)

  // Build the returning state and apply consequence mutations to it
  const result: GameState = {
    ...next,
    rumors: pruned,
    bondVisibility: newBondVisibility,
    availableQuestLeads: [...next.availableQuestLeads],
    activityLog: [...next.activityLog],
  }
  applyRumorConsequences(result, preSpread, afterSpread)

  return result
}
