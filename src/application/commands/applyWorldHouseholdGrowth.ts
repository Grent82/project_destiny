import type { GameState, SiteAccessState, SiteRoomInstance, SiteRuntime } from '../../domain'
import type { WorldHousehold } from '../../domain/world/contracts'

import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { resolveSiteRuntime } from './siteLifecycle'

const GROWTH_COOLDOWN_DAYS = 5
const MAX_GROWTH_STAGE = 2
const MAX_GROWTHS_PER_DAY = 3
const MIN_RESOURCE_SCORE = 60

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

function applyGrowthStage(site: SiteRuntime, household: WorldHousehold, stage: number): SiteRuntime {
  const repurposed = stage === 1 ? repurposeExistingRoom(site, stage) : null
  if (repurposed) {
    return {
      ...repurposed,
      tags: withGrowthStage(repurposed.tags, stage),
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
      tags: withGrowthStage(site.tags, stage),
      knownRoomIds:
        site.mode === 'concrete'
          ? Array.from(new Set([...site.knownRoomIds, newRoom.roomId]))
          : site.knownRoomIds,
    }
  }

  const deepened = deepenExistingCapacity(site, stage)
  return {
    ...deepened,
    tags: withGrowthStage(deepened.tags, stage),
  }
}

function shouldGrowHousehold(
  state: GameState,
  household: WorldHousehold,
  runtime: SiteRuntime,
  rng: () => number,
): boolean {
  const score = investmentScore(household)
  if (score < MIN_RESOURCE_SCORE) return false

  const stage = getGrowthStage(runtime)
  if (stage >= MAX_GROWTH_STAGE) return false

  const lastGrowth = state.lastFiredDay[`site-growth:${runtime.siteId}`]
  if (lastGrowth !== undefined && state.day - lastGrowth < GROWTH_COOLDOWN_DAYS) return false

  const chance = Math.min(0.9, 0.2 + score / 200 + household.stability / 250)
  return rng() <= chance
}

export function applyWorldHouseholdGrowth(state: GameState, rng: () => number): GameState {
  let next = cloneGrowthState(state)
  let applied = 0

  const households = [...contentCatalog.worldHouseholds].sort(
    (left, right) => investmentScore(right) - investmentScore(left),
  )

  for (const household of households) {
    if (applied >= MAX_GROWTHS_PER_DAY) break

    const siteId = `site-${household.id}`
    const runtime = resolveSiteRuntime(next, siteId)
    if (!runtime) continue
    if (runtime.sourceKind !== 'world-household') continue
    if (!shouldGrowHousehold(next, household, runtime, rng)) continue

    const nextStage = getGrowthStage(runtime) + 1
    const grown = applyGrowthStage(runtime, household, nextStage)

    next.siteRuntimes[siteId] = grown
    next.lastFiredDay[`site-growth:${siteId}`] = next.day
    next = appendActivityLogEntry(
      next,
      'system',
      `${grown.name} quietly invests in its own footprint. New room capacity and tighter internal control begin to show.`,
    )
    applied += 1
  }

  return next
}
