import type { GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

export const CAPTIVITY_PREGNANCY_DISCOVERY_EVENT_ID = EVENT_IDS.CAPTIVITY_PREGNANCY_DISCOVERY

export function captivityPregnancyDiscoveryKey(npcId: string): string {
  return `captivity-pregnancy-discovery-${npcId}`
}

function selectSourceVariant(
  state: GameState,
  npc: NpcRuntimeState,
): 'self' | 'healer' | 'guard' {
  const playerTrust =
    state.relationships[`player→${npc.npcId}`]?.trust ??
    state.relationships[`player-${npc.npcId}`]?.trust ??
    0

  if (playerTrust > 50 && npc.traits.empathy > 60) {
    return 'self'
  }

  if (npc.states.health < 60 || npc.states.stress > 70) {
    return 'healer'
  }

  return 'guard'
}

function sourceLead(source: 'self' | 'healer' | 'guard', npcName: string): string {
  switch (source) {
    case 'self':
      return `${npcName} asks to speak in private and does not waste words once the door is shut.`
    case 'healer':
      return `The house healer requests a private audience after morning rounds and speaks with professional care before emotion.`
    case 'guard':
      return `A guard report reaches you without embellishment. Someone thought you needed to know before rumor did its work.`
  }
}

function traitResponse(npc: NpcRuntimeState): string {
  if (npc.traits.empathy > 60) {
    return `${npc.name} grieves ahead of herself. She is already thinking about what a child would mean in Valdenmoor and who would try to claim that meaning for her.`
  }

  if (npc.traits.empathy < 40 && npc.traits.discipline > 60) {
    return `${npc.name} keeps her voice level and asks for options before sympathy. Control is the only dignity she trusts right now.`
  }

  if (npc.states.fear > 50) {
    return `${npc.name} is visibly frayed. Safety has to become concrete before any larger question can be asked of her.`
  }

  if (npc.states.health > 70 && npc.states.stress < 40) {
    return `${npc.name} is steady enough to have started deciding for herself already. The discovery is not the first blow; it is the newest fact.`
  }

  return `${npc.name} does not offer a clean emotion for the room. What matters is that the truth has arrived and cannot be put back into silence.`
}

export function buildCaptivityPregnancyDiscoveryPresentationText(
  state: GameState,
  npc: NpcRuntimeState,
): string {
  const source = selectSourceVariant(state, npc)
  return [
    sourceLead(source, npc.name),
    traitResponse(npc),
    'No one in the room mistakes this for a puzzle. It is a condition to be protected, investigated, concealed, or answered for.',
  ].join(' ')
}

function queueInstance(state: GameState, npc: NpcRuntimeState): GameState {
  const key = captivityPregnancyDiscoveryKey(npc.npcId)
  if (state.lastFiredDay[key] !== undefined) {
    return state
  }

  return enqueueTemplateEvent(
    {
      ...state,
      lastFiredDay: {
        ...state.lastFiredDay,
        [key]: state.day,
      },
    },
    CAPTIVITY_PREGNANCY_DISCOVERY_EVENT_ID,
    {
      instanceId: `${key}-${state.day}`,
      firedOnDay: state.day,
      sourceDistrictId: state.currentDistrictId,
      sourceNpcId: npc.npcId,
      presentationText: buildCaptivityPregnancyDiscoveryPresentationText(state, npc),
      contextId: null,
    },
  )
}

export function ensureCaptivityPregnancyDiscovery(state: GameState): GameState {
  let next = state

  for (const npc of next.roster) {
    if (npc.pregnancyState?.context !== 'unknown') continue
    next = queueInstance(next, npc)
  }

  return next
}
