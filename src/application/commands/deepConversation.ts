import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { advanceRomanceArc } from './advanceRomanceArc'

const PLAYER_ID = 'player'

type ConversationTopic = 'values' | 'fears' | 'dreams' | 'past'

const TOPIC_LABELS: Record<ConversationTopic, string> = {
  values: 'your shared values and what you both fight for',
  fears: 'the things that keep you both awake at night',
  dreams: 'what you hope to build when this is all over',
  past: 'the scars and stories that made you who you are',
}

function canHaveDeepConversation(state: GameState, npcId: string): NonNullable<GameState['roster'][0]> | null {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  if (npc.assignment === 'deployed') return null
  if (npc.status === 'ward') return null
  if (npc.captivityState?.status === 'captive' || npc.captivityState?.status === 'missing') return null
  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef) return null
  return npc
}

function selectTopic(npc: NonNullable<GameState['roster'][0]>): ConversationTopic {
  const { empathy, prudence, ambition, curiosity } = npc.traits

  if (empathy >= 60 && curiosity >= 50) return 'fears'
  if (ambition >= 60 && prudence >= 55) return 'values'
  if (curiosity >= 60) return 'past'
  return 'dreams'
}

function getTopicGains(topic: ConversationTopic, npc: NonNullable<GameState['roster'][0]>): { affinity?: number; respect?: number; trust?: number; fear?: number; loyalty?: number } {
  const { empathy, prudence, ambition, curiosity, ruthlessness } = npc.traits

  let gains: { affinity?: number; respect?: number; trust?: number; fear?: number; loyalty?: number }

  switch (topic) {
    case 'values':
      gains = { respect: 3, trust: 2, fear: -1 }
      if (prudence >= 60) gains.respect = (gains.respect ?? 0) + 2
      if (ambition >= 60) gains.trust = (gains.trust ?? 0) + 1
      break
    case 'fears':
      gains = { trust: 4, affinity: 2, fear: -2 }
      if (empathy >= 65) gains.trust = (gains.trust ?? 0) + 2
      if (ruthlessness >= 65) gains.trust = Math.max(1, (gains.trust ?? 0) - 1)
      break
    case 'dreams':
      gains = { affinity: 3, loyalty: 2 }
      break
    case 'past':
      gains = { trust: 3, affinity: 2, fear: -1 }
      if (empathy >= 60) gains.affinity = (gains.affinity ?? 0) + 1
      if (curiosity >= 60) gains.trust = (gains.trust ?? 0) + 2
      if (ruthlessness >= 65) gains.affinity = Math.max(1, (gains.affinity ?? 0) - 1)
      break
  }

  return gains
}

function topicResponse(npc: NonNullable<GameState['roster'][0]>, topic: ConversationTopic, advanced: boolean): string {
  const { empathy, prudence, ambition } = npc.traits

  if (advanced) {
    return `The conversation deepens. ${npc.name} nods slowly. "This is the part I don't often share. Thank you for listening."`
  }

  if (topic === 'fears' && empathy >= 60) {
    return `${npc.name} exhales, some tension leaving their shoulders. "I don't talk about this often. But you... you understand."`
  }
  if (topic === 'values' && prudence >= 55) {
    return `${npc.name} studies you for a long moment, then gives a single, deliberate nod. "We're not so different on this point."`
  }
  if (topic === 'dreams' && ambition >= 55) {
    return `There's a rare softness in ${npc.name}'s expression. "Sometimes I forget I'm allowed to want things beyond survival."`
  }
  if (topic === 'past' && empathy >= 50) {
    return `${npc.name} looks away for a moment, then back. "That happened a long time ago. But it still matters."`
  }

  return `The conversation moves beyond tactics and logistics. ${npc.name} seems to relax, just slightly.`
}

/**
 * Engage in a deep conversation with an NPC about values, fears, dreams, or past.
 *
 * Returns state unchanged if:
 * - NPC not on roster or not co-located at the house
 * - NPC is a ward, captive, or missing
 * - Already had a deep conversation with this NPC today
 */
export function deepConversation(state: GameState, npcId: string): GameState {
  const npc = canHaveDeepConversation(state, npcId)
  if (!npc) return state

  const topic = selectTopic(npc)

  const cooldownKey = `deep-conv-player-${npcId}-${state.day}-${topic}`
  if (state.lastFiredDay[cooldownKey] === state.day) return state

  const key = buildRelationshipKey(PLAYER_ID, npcId)
  const reverseKey = buildRelationshipKey(npcId, PLAYER_ID)
  const current = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const reverse = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

  const gains = getTopicGains(topic, npc)

  let next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: {
        ...current,
        affinity: Math.min(100, current.affinity + (gains.affinity ?? 0)),
        respect: Math.min(100, current.respect + (gains.respect ?? 0)),
        trust: Math.min(100, current.trust + (gains.trust ?? 0)),
        fear: Math.max(-100, current.fear + (gains.fear ?? 0)),
        loyalty: Math.min(100, (current.loyalty ?? 0) + (gains.loyalty ?? 0)),
      },
      [reverseKey]: {
        ...reverse,
        affinity: Math.min(100, reverse.affinity + Math.max(1, (gains.affinity ?? 0) - 1)),
        trust: Math.min(100, (reverse.trust ?? 0) + Math.max(1, (gains.trust ?? 0) - 1)),
      },
    },
    lastFiredDay: {
      ...state.lastFiredDay,
      [cooldownKey]: state.day,
    },
  }

  const beforeStage = next.relationships[key]?.intimacyStage ?? 'none'
  next = advanceRomanceArc(next, npcId)
  const afterStage = next.relationships[key]?.intimacyStage ?? 'none'
  const advanced = beforeStage !== afterStage

  const topicLabel = TOPIC_LABELS[topic]
  const response = topicResponse(npc, topic, advanced)

  next = appendActivityLogEntry(
    next,
    'system',
    `You sit down with ${npc.name} to talk about ${topicLabel}. ${response}${advanced ? ` The bond deepens to ${afterStage}.` : ''}`,
  )
  next.activityLog[0]!.id = `deep-conv::${npcId}::${topic}::${state.day}::${state.timeSlot}`

  return next
}
