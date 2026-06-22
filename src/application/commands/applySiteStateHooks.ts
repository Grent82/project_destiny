import type { CaptivityState, GameState, NpcSitePresence, SiteRuntime } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { PLAYER_HOUSE_SITE_ID } from '../content/siteRuntime'
import { appendActivityLogEntry } from './activityLog'
import { getAllNpcCaptivityStates } from './captivityRegistry'
import { addQuestLeadIfNew } from './questLifecycle'
import { resolveSiteRuntime } from './siteLifecycle'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

export const SITE_PRESSURE_EVENT_ID = EVENT_IDS.SITE_PRESSURE_WARNING

const SITE_PRESSURE_COOLDOWN_DAYS = 5
const CAPTIVITY_RUMOR_MIN_DAYS = 2
const MAX_PENDING_EVENTS = 10

function allRelevantSiteIds(state: GameState): string[] {
  const ids = new Set<string>()
  ids.add(PLAYER_HOUSE_SITE_ID)

  for (const siteId of Object.keys(state.siteRuntimes)) ids.add(siteId)
  for (const household of contentCatalog.worldHouseholds) ids.add(`site-${household.id}`)
  for (const poi of contentCatalog.pois) ids.add(`site-${poi.id}`)
  for (const presence of state.npcSitePresences) ids.add(presence.siteId)
  for (const cap of Object.values(getAllNpcCaptivityStates(state))) {
    if (cap.siteId) ids.add(cap.siteId)
  }

  return [...ids]
}

function getCaptivesForSite(state: GameState, siteId: string): Array<{ npcId: string; captivity: CaptivityState }> {
  return Object.entries(getAllNpcCaptivityStates(state))
    .filter(([, captivity]) => captivity.siteId === siteId && (captivity.status === 'captive' || captivity.status === 'missing'))
    .map(([npcId, captivity]) => ({ npcId, captivity }))
}

function getPresencesForSite(state: GameState, siteId: string): NpcSitePresence[] {
  return state.npcSitePresences.filter((presence) => presence.siteId === siteId)
}

function cloneHookState(state: GameState): GameState {
  return {
    ...state,
    activityLog: [...state.activityLog],
    availableQuestLeads: [...state.availableQuestLeads],
    pendingEvents: [...state.pendingEvents],
    eventInstances: [...state.eventInstances],
    rumors: [...state.rumors],
    lastFiredDay: { ...state.lastFiredDay },
  }
}

function getRoom(runtime: SiteRuntime, roomId: string | null) {
  if (!roomId) return null
  return runtime.roomInstances.find((room) => room.roomId === roomId) ?? null
}

function hasDurableRoomTruth(runtime: SiteRuntime, roomId: string | null) {
  if (!roomId) return false
  if (runtime.mode === 'concrete') return true
  return runtime.knownRoomIds.includes(roomId)
}

function roomSupportsCustodyLead(runtime: SiteRuntime, captivity: CaptivityState) {
  const room = getRoom(runtime, captivity.roomId)
  if (!room || !hasDurableRoomTruth(runtime, captivity.roomId)) return false

  return (
    room.accessState === 'guarded' ||
    room.accessState === 'sealed' ||
    room.accessState === 'hidden' ||
    room.condition === 'locked' ||
    runtime.kind === 'holding-site'
  )
}

function buildSiteCaptivityRumor(site: SiteRuntime, npcId: string, captivity: CaptivityState) {
  const districtName = contentCatalog.districtsById.get(site.districtId)?.name ?? 'the city'
  const room = getRoom(site, captivity.roomId)
  const siteLabel = site.name
  const roomLabel = room?.name ?? 'its back rooms'
  const visibilityTag = site.mode === 'concrete' || site.knownRoomIds.includes(captivity.roomId ?? '')
    ? `${roomLabel} inside ${siteLabel}`
    : `${siteLabel} in ${districtName}`

  return {
    id: `site-captivity-rumor-${npcId}-${site.siteId}-d${site.lastConcretizedDay ?? 0}`,
    kind: 'ambient' as const,
    source: 'generated' as const,
    districtId: site.districtId,
    originNpcId: site.ownerNpcId,
    templateId: null,
    text: `People are quietly saying someone is being kept off the books around ${visibilityTag}.`,
    subjectNpcIds: [npcId],
    truth: 'true' as const,
    credibility: room ? 55 : 40,
    heat: room ? 42 : 30,
    createdDay: 1,
    lastSpreadDay: 1,
    eventSource: `site-captivity-rumor:${npcId}:${site.siteId}`,
  }
}

function maybeAddCaptivityRumor(next: GameState, site: SiteRuntime, npcId: string, captivity: CaptivityState) {
  if (captivity.timeHeldDays < CAPTIVITY_RUMOR_MIN_DAYS) return next

  const rumorKey = `site-captivity-rumor:${npcId}:${site.siteId}`
  if (next.rumors.some((rumor) => rumor.eventSource === rumorKey)) return next

  const rumor = buildSiteCaptivityRumor(site, npcId, captivity)
  const withRumor = {
    ...next,
    rumors: [
      {
        ...rumor,
        createdDay: next.day,
        lastSpreadDay: next.day,
        id: `site-captivity-rumor-${npcId}-${site.siteId}-d${next.day}`,
      },
      ...next.rumors,
    ],
  }

  return appendActivityLogEntry(
    withRumor,
    'system',
    `Quiet talk now circles ${site.name}. Someone is being held there, or close enough to it that the distinction no longer matters.`,
  )
}

function maybeAddCustodyLead(next: GameState, site: SiteRuntime, captivity: CaptivityState) {
  if (!captivity.questTag) return next
  if (!roomSupportsCustodyLead(site, captivity)) return next

  const added = addQuestLeadIfNew(next, captivity.questTag, {
    discoverySource: 'event',
    discoveryDistrictId: site.districtId,
    sourceNpcId: site.ownerNpcId ?? null,
    sourcePoiId: site.sourceKind === 'poi' ? site.sourceId : null,
    issuerFactionId: site.controllingFactionId ?? captivity.holderId ?? null,
  })

  if (!added) return next

  return appendActivityLogEntry(
    next,
    'system',
    `A usable lead forms around ${site.name}. There is now enough room-truth and custody detail to act instead of speculate.`,
  )
}

function pendingPressureForSite(state: GameState, siteId: string) {
  return state.eventInstances.some(
    (instance) =>
      instance.eventId === SITE_PRESSURE_EVENT_ID &&
      instance.contextId === siteId &&
      instance.resolvedOnDay === null,
  )
}

function queueSitePressureEvent(next: GameState, site: SiteRuntime, pressureScore: number, protectedCount: number, captiveCount: number) {
  const key = `site-pressure:${site.siteId}`
  const lastDay = next.lastFiredDay[key]
  if (lastDay !== undefined && next.day - lastDay < SITE_PRESSURE_COOLDOWN_DAYS) return next
  if (pendingPressureForSite(next, site.siteId)) return next
  if (next.pendingEvents.length >= MAX_PENDING_EVENTS) return next

  const districtName = contentCatalog.districtsById.get(site.districtId)?.name ?? site.districtId
  let pressureText: string

  if (captiveCount > 0 && protectedCount > 0) {
    pressureText = `${site.name} is carrying quiet pressure in ${districtName}. ${captiveCount} captive situation${captiveCount === 1 ? '' : 's'} and ${protectedCount} sheltered or discreet occupant${protectedCount === 1 ? '' : 's'} make the place harder to keep invisible.`
  } else if (captiveCount > 0) {
    pressureText = `${site.name} is carrying quiet pressure in ${districtName}. ${captiveCount} captive situation${captiveCount === 1 ? '' : 's'} here draw attention.`
  } else if (protectedCount > 0) {
    pressureText = `${site.name} is carrying quiet pressure in ${districtName}. ${protectedCount} sheltered or discreet occupant${protectedCount === 1 ? '' : 's'} make the place visible to the wrong people if the pattern holds.`
  } else {
    pressureText = `${site.name} is carrying quiet pressure in ${districtName} due to low security and its sensitive nature.`
  }

  return enqueueTemplateEvent(
    {
      ...next,
      lastFiredDay: {
        ...next.lastFiredDay,
        [key]: next.day,
      },
    },
    SITE_PRESSURE_EVENT_ID,
    {
      instanceId: `site-pressure-${site.siteId}-${next.day}`,
      firedOnDay: next.day,
      sourceDistrictId: site.districtId,
      sourceNpcId: site.ownerNpcId,
      presentationText: `${pressureText} Pressure estimate: ${pressureScore}.`,
      contextId: site.siteId,
    },
  )
}

function maybeQueueProtectedSitePressure(next: GameState, site: SiteRuntime, presences: NpcSitePresence[], captives: Array<{ npcId: string; captivity: CaptivityState }>) {
  if (site.kind !== 'sanctuary' && site.kind !== 'safehouse' && site.kind !== 'holding-site') return next

  const protectedCount = presences.filter(
    (presence) =>
      presence.status === 'present' &&
      (presence.role === 'sheltered' || presence.role === 'patient' || presence.visibility !== 'public'),
  ).length
  const captiveCount = captives.length

  const pressureScore = protectedCount + captiveCount * 2 + (site.securityScore < 40 ? 2 : 0)
  if (pressureScore < 2) return next

  return queueSitePressureEvent(next, site, pressureScore, protectedCount, captiveCount)
}

export function applySiteStateHooks(state: GameState): GameState {
  let next = cloneHookState(state)

  for (const siteId of allRelevantSiteIds(state)) {
    const runtime = resolveSiteRuntime(next, siteId)
    if (!runtime) continue

    const captives = getCaptivesForSite(next, siteId)
    const presences = getPresencesForSite(next, siteId)

    for (const { npcId, captivity } of captives) {
      if (roomSupportsCustodyLead(runtime, captivity) && captivity.questTag) {
        next = maybeAddCustodyLead(next, runtime, captivity)
      } else {
        next = maybeAddCaptivityRumor(next, runtime, npcId, captivity)
      }
    }

    next = maybeQueueProtectedSitePressure(next, runtime, presences, captives)
  }

  return next
}
