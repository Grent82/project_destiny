import type { CaptivityCondition, CaptivityState, GameState, NpcRuntimeState, SiteRuntime } from '../../domain'

import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { getAllNpcCaptivityStates, setNpcCaptivityState } from './captivityRegistry'
import { resolveSiteRuntime } from './siteLifecycle'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

export const ABSTRACT_CUSTODY_ALERT_EVENT_ID = EVENT_IDS.ABSTRACT_CUSTODY_ALERT

const ALERT_COOLDOWN_DAYS = 5
const MAX_PENDING_EVENTS = 10

const WORSENED_CONDITION: Record<CaptivityCondition, CaptivityCondition> = {
  healthy: 'hurt',
  hurt: 'broken',
  broken: 'altered',
  altered: 'altered',
}

const IMPROVED_CONDITION: Record<CaptivityCondition, CaptivityCondition> = {
  healthy: 'healthy',
  hurt: 'healthy',
  broken: 'hurt',
  altered: 'broken',
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((npc) => ({ ...npc, states: { ...npc.states } })),
    pendingEvents: [...state.pendingEvents],
    eventInstances: [...state.eventInstances],
    rumors: [...state.rumors],
    lastFiredDay: { ...state.lastFiredDay },
    activityLog: [...state.activityLog],
  }
}

function allAbstractSiteIds(state: GameState): string[] {
  const ids = new Set<string>()
  for (const siteId of Object.keys(state.siteRuntimes)) {
    if (state.siteRuntimes[siteId]?.mode === 'abstract') ids.add(siteId)
  }
  for (const household of contentCatalog.worldHouseholds) ids.add(`site-${household.id}`)
  for (const poi of contentCatalog.pois) ids.add(`site-${poi.id}`)
  for (const presence of state.npcSitePresences) ids.add(presence.siteId)
  for (const captivity of Object.values(getAllNpcCaptivityStates(state))) {
    if (captivity.siteId) ids.add(captivity.siteId)
  }
  return [...ids]
}

function getRosterNpc(state: GameState, npcId: string): NpcRuntimeState | undefined {
  return state.npcRuntimeStates.find((npc) => npc.npcId === npcId)
}

function getCaptivesForSite(state: GameState, siteId: string) {
  return Object.entries(getAllNpcCaptivityStates(state))
    .filter(([, captivity]) => captivity.siteId === siteId && (captivity.status === 'captive' || captivity.status === 'missing'))
    .map(([npcId, captivity]) => ({ npcId, captivity }))
}

function queueAbstractCustodyAlert(next: GameState, site: SiteRuntime, npcId: string, captivity: CaptivityState) {
  const key = `abstract-custody-alert:${site.siteId}`
  const lastDay = next.lastFiredDay[key]
  if (lastDay !== undefined && next.day - lastDay < ALERT_COOLDOWN_DAYS) return next
  if (next.pendingEvents.length >= MAX_PENDING_EVENTS) return next
  if (next.eventInstances.some((instance) => instance.eventId === ABSTRACT_CUSTODY_ALERT_EVENT_ID && instance.contextId === site.siteId && instance.resolvedOnDay === null)) {
    return next
  }

  const districtName = contentCatalog.districtsById.get(site.districtId)?.name ?? site.districtId
  const npcName = getRosterNpc(next, npcId)?.name ?? contentCatalog.npcsById.get(npcId)?.name ?? npcId
  const detail =
    captivity.condition === 'altered'
      ? `${npcName} is being changed by what is happening in ${site.name}, and the city will not leave that truth buried forever.`
      : `${npcName}'s condition is worsening inside ${site.name}. ${districtName} will eventually notice, even if the room stays off the books.`

  return enqueueTemplateEvent(
    {
      ...next,
      lastFiredDay: {
        ...next.lastFiredDay,
        [key]: next.day,
      },
    },
    ABSTRACT_CUSTODY_ALERT_EVENT_ID,
    {
      instanceId: `abstract-custody-alert-${site.siteId}-${next.day}`,
      firedOnDay: next.day,
      sourceDistrictId: site.districtId,
      sourceNpcId: npcId,
      presentationText: detail,
      contextId: site.siteId,
    },
  )
}

function appendAbstractCustodyRumor(next: GameState, site: SiteRuntime, npcId: string) {
  const eventSource = `abstract-custody-rumor:${npcId}:${site.siteId}`
  if (next.rumors.some((rumor) => rumor.eventSource === eventSource)) return next

  const districtName = contentCatalog.districtsById.get(site.districtId)?.name ?? site.districtId
  const npcName = getRosterNpc(next, npcId)?.name ?? contentCatalog.npcsById.get(npcId)?.name ?? npcId

  return appendActivityLogEntry(
    {
      ...next,
      rumors: [
        {
          id: `${eventSource}-d${next.day}`,
          kind: 'ambient',
          source: 'generated',
          districtId: site.districtId,
          originNpcId: site.ownerNpcId,
          templateId: null,
          text: `People near ${site.name} in ${districtName} are quietly asking why ${npcName} has not been seen and why the household's routines have tightened around that absence.`,
          subjectNpcIds: [npcId],
          truth: 'true',
          credibility: 48,
          heat: 34,
          createdDay: next.day,
          lastSpreadDay: next.day,
          eventSource,
        },
        ...next.rumors,
      ],
    },
    'system',
    `Offscreen custody around ${site.name} has started leaking into rumor. The place is no longer socially sealed, even if its rooms remain unseen.`,
  )
}

function applyHarshCustody(next: GameState, site: SiteRuntime, npcId: string, captivity: CaptivityState, guardCount: number) {
  const worsenedCondition = captivity.timeHeldDays >= 4 || guardCount > 0
    ? WORSENED_CONDITION[captivity.condition]
    : captivity.condition

  setNpcCaptivityState(next, npcId, {
    ...captivity,
    condition: worsenedCondition,
    compliance: captivity.compliance === 'resistant' ? 'conflicted' : captivity.compliance,
    bondType: captivity.bondType === 'none' ? 'fear' : captivity.bondType,
  })

  const npc = getRosterNpc(next, npcId)
  if (npc) {
    npc.states.fear = Math.min(100, npc.states.fear + 6)
    npc.states.stress = Math.min(100, npc.states.stress + 4)
  }

  if (worsenedCondition === 'broken' || worsenedCondition === 'altered') {
    return queueAbstractCustodyAlert(next, site, npcId, getAllNpcCaptivityStates(next)[npcId] ?? captivity)
  }

  return next
}

function applyProtectiveCustody(next: GameState, npcId: string, captivity: CaptivityState) {
  setNpcCaptivityState(next, npcId, {
    ...captivity,
    condition: IMPROVED_CONDITION[captivity.condition],
    bondType: captivity.bondType === 'fear' ? 'dependency' : captivity.bondType,
  })

  const npc = getRosterNpc(next, npcId)
  if (npc) {
    npc.states.fear = Math.max(0, npc.states.fear - 5)
    npc.states.stress = Math.max(0, npc.states.stress - 3)
  }

  return next
}

export function applyAbstractCustodySimulation(state: GameState, rng: () => number = Math.random): GameState {
  let next = cloneState(state)

  for (const siteId of allAbstractSiteIds(next)) {
    const site = resolveSiteRuntime(next, siteId)
    if (!site || site.mode !== 'abstract') continue

    const captives = getCaptivesForSite(next, siteId)
    if (captives.length === 0) continue

    const presences = next.npcSitePresences.filter((presence) => presence.siteId === siteId && presence.status === 'present')
    const guardCount = presences.filter((presence) => presence.role === 'guard').length
    const careCount = presences.filter((presence) => presence.role === 'worker' || presence.role === 'patient' || presence.role === 'sheltered').length
    const visitorCount = presences.filter((presence) => presence.role === 'visitor' || presence.role === 'resident' || presence.role === 'worker').length

    for (const { npcId, captivity } of captives) {
      const protective = captivity.regime === 'protective' || captivity.regime === 'medical' || site.kind === 'sanctuary' || site.kind === 'safehouse'
      const harsh = captivity.regime === 'guarded' || captivity.regime === 'penal' || captivity.regime === 'commercial' || site.kind === 'holding-site'

      if (protective && careCount > 0 && rng() <= 0.8) {
        next = applyProtectiveCustody(next, npcId, captivity)
      } else if (harsh && rng() <= 0.8) {
        next = applyHarshCustody(next, site, npcId, captivity, guardCount)
      }

      if (visitorCount > 0 && captivity.timeHeldDays >= 3 && rng() <= 0.45) {
        next = appendAbstractCustodyRumor(next, site, npcId)
      }
    }
  }

  return next
}
