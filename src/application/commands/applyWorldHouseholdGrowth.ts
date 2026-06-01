import type { GameState, SiteAccessState, SiteRoomInstance, SiteRuntime } from '../../domain'
import type { WorldHousehold } from '../../domain/world/contracts'

import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { adjustCityDial, adjustCityResource, adjustDistrictTension } from './economicConsequences'
import { resolveSiteRuntime } from './siteLifecycle'

const GROWTH_COOLDOWN_DAYS = 5
const MAX_GROWTH_STAGE = 2
const MAX_GROWTHS_PER_DAY = 3
const MIN_RESOURCE_SCORE = 60
const GROWTH_COMMITMENT_PER_STAGE = 18

type GrowthPlan =
  | { kind: 'skip' }
  | {
      kind: 'pressure'
      runtime: SiteRuntime
      conflictType: string
      summary: string
    }
  | {
      kind: 'expand'
      runtime: SiteRuntime
      stage: number
      summary: string
    }

function cloneGrowthState(state: GameState): GameState {
  return {
    ...state,
    siteRuntimes: { ...state.siteRuntimes },
    lastFiredDay: { ...state.lastFiredDay },
    activityLog: [...state.activityLog],
  }
}

function getGrowthStage(runtime: SiteRuntime): number {
  const stages = runtime.tags
    .map((tag) => (tag.startsWith('growth-stage:') ? Number(tag.slice('growth-stage:'.length)) : null))
    .filter((value): value is number => value !== null && Number.isFinite(value))

  return stages.length === 0 ? 0 : Math.max(...stages)
}

function withGrowthStage(tags: string[], stage: number): string[] {
  const filtered = tags.filter((tag) => !tag.startsWith('growth-stage:'))
  return [...filtered, `growth-stage:${stage}`]
}

function getGrowthCommitment(runtime: SiteRuntime): number {
  const commitments = runtime.tags
    .map((tag) => (tag.startsWith('growth-commitment:') ? Number(tag.slice('growth-commitment:'.length)) : null))
    .filter((value): value is number => value !== null && Number.isFinite(value))

  return commitments.length === 0 ? 0 : Math.max(...commitments)
}

function withGrowthCommitment(tags: string[], commitment: number): string[] {
  const filtered = tags.filter((tag) => !tag.startsWith('growth-commitment:'))
  return [...filtered, `growth-commitment:${Math.max(0, Math.round(commitment))}`]
}

function withGrowthPressure(tags: string[], pressure: string): string[] {
  return tags.includes(`growth-pressure:${pressure}`) ? tags : [...tags, `growth-pressure:${pressure}`]
}

function investmentScore(household: WorldHousehold): number {
  return (
    household.resources.coin +
    household.resources.food / 2 +
    household.resources.favors +
    household.resources.secrets
  )
}

function nextAccessState(current: SiteAccessState): SiteAccessState {
  switch (current) {
    case 'open':
      return 'restricted'
    case 'restricted':
      return 'guarded'
    case 'guarded':
      return 'sealed'
    case 'sealed':
    case 'hidden':
    default:
      return current
  }
}

function createGrowthRoom(site: SiteRuntime, household: WorldHousehold, stage: number): SiteRoomInstance {
  if (site.kind === 'sanctuary') {
    return {
      roomId: `${site.sourceId}-recovery-ward-${stage}`,
      name: 'Recovery Ward',
      functionId: 'recovery',
      condition: 'intact',
      capacity: 3,
      accessState: 'restricted',
      tags: ['household-growth', 'care-capacity'],
    }
  }

  if (site.kind === 'safehouse') {
    return {
      roomId: `${site.sourceId}-back-room-${stage}`,
      name: 'Back Room',
      functionId: 'safehouse',
      condition: 'intact',
      capacity: 2,
      accessState: 'hidden',
      tags: ['household-growth', 'concealment'],
    }
  }

  if (household.tags.includes('debt-hidden') || household.tags.includes('disappearances')) {
    return {
      roomId: `${site.sourceId}-guard-post-${stage}`,
      name: 'Guard Post',
      functionId: 'security',
      condition: 'intact',
      capacity: 2,
      accessState: 'guarded',
      tags: ['household-growth', 'security-post'],
    }
  }

  return {
    roomId: `${site.sourceId}-annex-${stage}`,
    name: 'Service Annex',
    functionId: 'quarters',
    condition: 'intact',
    capacity: 2,
    accessState: 'restricted',
    tags: ['household-growth', 'capacity'],
  }
}

function repurposeExistingRoom(site: SiteRuntime, stage: number): SiteRuntime | null {
  const candidate = site.roomInstances.find((room) => room.functionId === null)
  if (!candidate) return null

  const nextRoom: SiteRoomInstance = {
    ...candidate,
    functionId: site.kind === 'holding-site' || site.securityScore >= 50 ? 'holding' : 'storage',
    capacity: Math.max(candidate.capacity, 2),
    accessState: site.kind === 'holding-site' || site.securityScore >= 50 ? 'guarded' : 'restricted',
    tags: [...candidate.tags, 'household-growth', `repurposed-stage:${stage}`],
  }

  const roomInstances = site.roomInstances.map((room) => (room.roomId === candidate.roomId ? nextRoom : room))
  return {
    ...site,
    roomInstances,
    securityScore: Math.min(100, site.securityScore + 8),
  }
}

function deepenExistingCapacity(site: SiteRuntime, stage: number): SiteRuntime {
  const target =
    site.roomInstances.find((room) => room.tags.includes('household-growth')) ??
    site.roomInstances.find((room) => room.functionId !== null) ??
    site.roomInstances[0]

  if (!target) return site

  const roomInstances = site.roomInstances.map((room) =>
    room.roomId === target.roomId
      ? {
          ...room,
          capacity: room.capacity + 1,
          accessState: nextAccessState(room.accessState),
          tags: room.tags.includes(`deepened-stage:${stage}`) ? room.tags : [...room.tags, `deepened-stage:${stage}`],
        }
      : room,
  )

  return {
    ...site,
    roomInstances,
    securityScore: Math.min(100, site.securityScore + 6),
  }
}

function effectiveInvestmentScore(household: WorldHousehold, runtime: SiteRuntime): number {
  return Math.max(0, investmentScore(household) - getGrowthCommitment(runtime))
}

function resolvedInvestmentScore(state: GameState, household: WorldHousehold): number {
  const runtime = resolveSiteRuntime(state, `site-${household.id}`)
  return runtime ? effectiveInvestmentScore(household, runtime) : investmentScore(household)
}

function findConflictTarget(conflictTargetId: string): WorldHousehold | null {
  return contentCatalog.worldHouseholdsById.get(conflictTargetId) ?? null
}

function applyConflictPressure(runtime: SiteRuntime, conflictType: string, severity: number): SiteRuntime {
  return {
    ...runtime,
    securityScore: Math.min(100, runtime.securityScore + 2 + severity * 2),
    tags: withGrowthPressure(runtime.tags, conflictType),
  }
}

function applyHouseholdEconomicEffects(state: GameState, household: WorldHousehold, runtime: SiteRuntime, outcome: 'expand' | 'pressure'): GameState {
  let next = state

  if (outcome === 'expand') {
    if (household.kind === 'faction_seat' || runtime.kind === 'industrial') {
      next = adjustCityResource(next, 'materialStock', 1)
      next = adjustCityDial(next, 'prosperity', 1)
    }

    if (runtime.kind === 'sanctuary') {
      next = adjustCityResource(next, 'foodSecurity', 1)
      next = adjustCityDial(next, 'unrest', -1)
    }

    if (household.tags.includes('disappearances') || household.tags.includes('debt-hidden')) {
      next = adjustCityDial(next, 'corruption', 1)
    }
  }

  if (outcome === 'pressure') {
    next = adjustDistrictTension(next, household.districtId, 2)
    next = adjustCityDial(next, 'prosperity', -1)
  }

  return next
}

function applyGrowthStage(site: SiteRuntime, household: WorldHousehold, stage: number): SiteRuntime {
  const repurposed = stage === 1 ? repurposeExistingRoom(site, stage) : null
  if (repurposed) {
    return {
      ...repurposed,
      tags: withGrowthCommitment(withGrowthStage(repurposed.tags, stage), getGrowthCommitment(site) + GROWTH_COMMITMENT_PER_STAGE),
      knownRoomIds:
        repurposed.mode === 'concrete'
          ? Array.from(new Set(repurposed.roomInstances.map((room) => room.roomId)))
          : repurposed.knownRoomIds,
    }
  }

  if (stage === 1) {
    const newRoom = createGrowthRoom(site, household, stage)
    return {
      ...site,
      roomInstances: [...site.roomInstances, newRoom],
      securityScore: Math.min(100, site.securityScore + 10),
      tags: withGrowthCommitment(withGrowthStage(site.tags, stage), getGrowthCommitment(site) + GROWTH_COMMITMENT_PER_STAGE),
      knownRoomIds:
        site.mode === 'concrete'
          ? Array.from(new Set([...site.knownRoomIds, newRoom.roomId]))
          : site.knownRoomIds,
    }
  }

  const deepened = deepenExistingCapacity(site, stage)
  return {
    ...deepened,
    tags: withGrowthCommitment(withGrowthStage(deepened.tags, stage), getGrowthCommitment(site) + GROWTH_COMMITMENT_PER_STAGE),
  }
}

function planWorldHouseholdGrowth(
  state: GameState,
  household: WorldHousehold,
  runtime: SiteRuntime,
  rng: () => number,
): GrowthPlan {
  const score = effectiveInvestmentScore(household, runtime)
  if (score < MIN_RESOURCE_SCORE) return { kind: 'skip' }

  const stage = getGrowthStage(runtime)
  if (stage >= MAX_GROWTH_STAGE) return { kind: 'skip' }

  const lastGrowth = state.lastFiredDay[`site-growth:${runtime.siteId}`]
  if (lastGrowth !== undefined && state.day - lastGrowth < GROWTH_COOLDOWN_DAYS) return { kind: 'skip' }

  for (const conflict of household.activeConflicts) {
    const rival = findConflictTarget(conflict.targetId)
    if (!rival) continue

    if (conflict.type === 'legitimacy-contest') {
      const rivalScore = investmentScore(rival)
      const strongerClaim = rival.reputation > household.reputation && rivalScore > score
      const defensivePivotChance = Math.min(0.95, 0.4 + conflict.severity * 0.2)

      if (strongerClaim && rng() <= defensivePivotChance) {
        return {
          kind: 'pressure',
          runtime: applyConflictPressure(runtime, conflict.type, conflict.severity),
          conflictType: conflict.type,
          summary: `${runtime.name} diverts coin and favors into legitimacy defense instead of expanding while a rival presses its claim.`,
        }
      }
    }
  }

  const chance = Math.min(0.9, Math.max(0.05, 0.2 + score / 220 + household.stability / 300 - getGrowthCommitment(runtime) / 100))
  if (rng() > chance) return { kind: 'skip' }

  return {
    kind: 'expand',
    runtime,
    stage: stage + 1,
    summary: `${runtime.name} quietly commits coin, favors, and internal labor to extend its footprint.`,
  }
}

export function applyWorldHouseholdGrowth(state: GameState, rng: () => number): GameState {
  let next = cloneGrowthState(state)
  let applied = 0

  const households = [...contentCatalog.worldHouseholds].sort(
    (left, right) => resolvedInvestmentScore(next, right) - resolvedInvestmentScore(next, left),
  )

  for (const household of households) {
    if (applied >= MAX_GROWTHS_PER_DAY) break

    const siteId = `site-${household.id}`
    const runtime = resolveSiteRuntime(next, siteId)
    if (!runtime) continue
    if (runtime.sourceKind !== 'world-household') continue
    const plan = planWorldHouseholdGrowth(next, household, runtime, rng)
    if (plan.kind === 'skip') continue

    if (plan.kind === 'pressure') {
      next.siteRuntimes[siteId] = plan.runtime
      next.lastFiredDay[`site-growth:${siteId}`] = next.day
      next = applyHouseholdEconomicEffects(next, household, plan.runtime, 'pressure')
      next = appendActivityLogEntry(next, 'system', plan.summary)
      applied += 1
      continue
    }

    const grown = applyGrowthStage(runtime, household, plan.stage)

    next.siteRuntimes[siteId] = grown
    next.lastFiredDay[`site-growth:${siteId}`] = next.day
    next = applyHouseholdEconomicEffects(next, household, grown, 'expand')
    next = appendActivityLogEntry(next, 'system', plan.summary)
    applied += 1
  }

  return next
}
