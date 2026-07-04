import type { CaptivityCondition, CaptivityCompliance, CaptivityState, GameState, NpcRuntimeState, SiteRuntime } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { writeNpcMemory } from './adjustRelationship'
import { getAllNpcCaptivityStates, setNpcCaptivityState } from './captivityRegistry'
import type { Rng } from './seededRng'
import { resolveSiteRuntime } from './siteLifecycle'

const HEALTHIER_CONDITION: Record<CaptivityCondition, CaptivityCondition> = {
  healthy: 'healthy',
  hurt: 'healthy',
  broken: 'hurt',
  altered: 'broken',
}

const COMPLIANCE_PROGRESS: Record<CaptivityCompliance, CaptivityCompliance> = {
  resistant: 'conflicted',
  conflicted: 'compliant',
  compliant: 'compliant',
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((npc) => ({ ...npc, states: { ...npc.states }, npcMemory: [...npc.npcMemory] })),
    npcCaptivityStates: { ...state.npcCaptivityStates },
    relationships: { ...state.relationships },
    activityLog: [...state.activityLog],
    rumors: [...state.rumors],
    lastFiredDay: { ...state.lastFiredDay },
  }
}

function allConcreteSiteIds(state: GameState): string[] {
  return Object.keys(state.siteRuntimes).filter((siteId) => state.siteRuntimes[siteId]?.mode === 'concrete')
}

function getRosterNpc(state: GameState, npcId: string): NpcRuntimeState | undefined {
  return state.npcRuntimeStates.find((npc) => npc.npcId === npcId)
}

function getNpcTraits(state: GameState, npcId: string) {
  const rosterNpc = getRosterNpc(state, npcId)
  if (rosterNpc) return rosterNpc.traits
  return contentCatalog.npcsById.get(npcId)?.startingTraits ?? null
}

function getRoom(runtime: SiteRuntime, roomId: string | null) {
  if (!roomId) return null
  return runtime.roomInstances.find((room) => room.roomId === roomId) ?? null
}

function getCaptivesForSite(state: GameState, siteId: string) {
  return Object.entries(getAllNpcCaptivityStates(state))
    .filter(([, captivity]) => captivity.siteId === siteId && (captivity.status === 'captive' || captivity.status === 'missing'))
    .map(([npcId, captivity]) => ({ npcId, captivity }))
}

function appendObservationRumor(next: GameState, site: SiteRuntime, npcId: string, captivity: CaptivityState) {
  if (!captivity.roomId) return next
  const eventSource = `room-observation:${npcId}:${site.siteId}:${captivity.roomId}`
  if (next.rumors.some((rumor) => rumor.eventSource === eventSource)) return next

  const room = getRoom(site, captivity.roomId)
  const districtName = contentCatalog.districtsById.get(site.districtId)?.name ?? site.districtId
  const observed = {
    id: `${eventSource}-d${next.day}`,
    kind: 'ambient' as const,
    source: 'generated' as const,
    districtId: site.districtId,
    originNpcId: site.ownerNpcId,
    templateId: null,
    text: `Someone now knows that ${site.name} is using ${room?.name ?? 'a back room'} in ${districtName} for off-book custody.`,
    subjectNpcIds: [npcId],
    truth: 'true' as const,
    credibility: 60,
    heat: 40,
    createdDay: next.day,
    lastSpreadDay: next.day,
    eventSource,
  }

  return appendActivityLogEntry(
    {
      ...next,
      rumors: [observed, ...next.rumors],
    },
    'system',
    `An observer carried room-specific custody details out of ${site.name}. The city now has a sharper clue than it did yesterday.`,
  )
}

function applyGuardPressure(next: GameState, npcId: string, captivity: CaptivityState, guardNpcIds: string[]) {
  const traits = guardNpcIds.map((guardNpcId) => getNpcTraits(next, guardNpcId)).filter(Boolean)
  const fearDelta = traits.some((trait) => trait!.ruthlessness > 60) ? 6 : 4
  const updatedCaptivity: CaptivityState = {
    ...captivity,
    compliance: COMPLIANCE_PROGRESS[captivity.compliance],
    bondType: captivity.bondType === 'none' ? 'fear' : captivity.bondType,
  }
  setNpcCaptivityState(next, npcId, updatedCaptivity)

  const captiveNpc = getRosterNpc(next, npcId)
  if (captiveNpc) {
    captiveNpc.states.fear = Math.min(100, captiveNpc.states.fear + fearDelta)
    writeNpcMemory(next, npcId, 'Guard pressure in confinement', guardNpcIds)
  }

  return next
}

function applyProtectiveCare(next: GameState, site: SiteRuntime, npcId: string, captivity: CaptivityState, caregiverNpcIds: string[]) {
  const updatedCaptivity: CaptivityState = {
    ...captivity,
    condition: HEALTHIER_CONDITION[captivity.condition],
    bondType: captivity.bondType === 'fear' ? 'dependency' : captivity.bondType,
  }
  setNpcCaptivityState(next, npcId, updatedCaptivity)

  const captiveNpc = getRosterNpc(next, npcId)
  if (captiveNpc) {
    captiveNpc.states.fear = Math.max(0, captiveNpc.states.fear - 5)
    writeNpcMemory(next, npcId, `Received care in ${site.name}`, caregiverNpcIds)
    const relationshipKey = buildRelationshipKey('player', npcId)
    const current = next.relationships[relationshipKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    next.relationships[relationshipKey] = {
      ...current,
      trust: Math.min(100, current.trust + 4),
      fear: Math.max(-100, current.fear - 2),
    }
  }

  return next
}

function roomSupportsProtectiveCare(site: SiteRuntime, roomId: string | null, captivity: CaptivityState) {
  const room = getRoom(site, roomId)
  return (
    site.kind === 'sanctuary' ||
    site.kind === 'safehouse' ||
    captivity.regime === 'protective' ||
    captivity.regime === 'medical' ||
    room?.functionId === 'medicine' ||
    room?.functionId === 'sanctuary'
  )
}

export function applyNpcRoomInteractions(state: GameState, rng: Rng = Math.random): GameState {
  let next = cloneState(state)

  for (const siteId of allConcreteSiteIds(next)) {
    const site = resolveSiteRuntime(next, siteId)
    if (!site || site.mode !== 'concrete') continue

    const sitePresences = next.npcSitePresences.filter((presence) => presence.siteId === siteId && presence.status === 'present')
    const captives = getCaptivesForSite(next, siteId)

    for (const { npcId, captivity } of captives) {
      const roomId = captivity.roomId
      if (!roomId) continue

      const roomPresences = sitePresences.filter((presence) => presence.roomId === roomId && presence.npcId !== npcId)
      if (roomPresences.length === 0) continue

      const guardNpcIds = roomPresences.filter((presence) => presence.role === 'guard').map((presence) => presence.npcId)
      if (guardNpcIds.length > 0) {
        next = applyGuardPressure(next, npcId, captivity, guardNpcIds)
      }

      const caregiverNpcIds = roomPresences
        .filter((presence) => presence.role === 'worker' || presence.role === 'patient' || presence.role === 'sheltered')
        .map((presence) => presence.npcId)
      if (caregiverNpcIds.length > 0 && roomSupportsProtectiveCare(site, roomId, captivity)) {
        next = applyProtectiveCare(next, site, npcId, getAllNpcCaptivityStates(next)[npcId] ?? captivity, caregiverNpcIds)
      }

      const observerRoll = rng()
      const observerNpcIds = roomPresences
        .filter((presence) => presence.role === 'visitor' || presence.role === 'resident' || presence.role === 'worker')
        .map((presence) => presence.npcId)
      if (observerNpcIds.length > 0 && observerRoll < 0.5) {
        next = appendObservationRumor(next, site, npcId, getAllNpcCaptivityStates(next)[npcId] ?? captivity)
        for (const observerNpcId of observerNpcIds) {
          writeNpcMemory(next, observerNpcId, `Observed confinement in ${site.name}`, [npcId])
        }
      }
    }
  }

  return next
}
