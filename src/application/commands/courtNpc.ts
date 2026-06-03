import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { advanceRomanceArc } from './advanceRomanceArc'

const PLAYER_ID = 'player'

function canCourtNpc(state: GameState, npcId: string) {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  if (npc.assignment === 'deployed') return null
  if (npc.status === 'ward') return null
  if (npc.captivityState?.status === 'captive' || npc.captivityState?.status === 'missing') return null
  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef?.romanceEligible) return null
  return npc
}

function stageLabel(stage: string | undefined) {
  switch (stage ?? 'none') {
    case 'affinity':
      return 'You choose to court them openly instead of leaving the feeling to drift.'
    case 'attachment':
      return 'The ritual is no longer casual. The house can see this bond taking shape.'
    case 'committed':
      return 'The bond is already committed; the gesture keeps it warm and public enough to matter.'
    case 'none':
    default:
      return 'You make time to court them directly instead of hoping proximity will do the work.'
  }
}

export function courtNpc(state: GameState, npcId: string): GameState {
  const npc = canCourtNpc(state, npcId)
  if (!npc) return state

  const cooldownKey = `courtship-player-${npcId}-${state.day}`
  if (state.lastFiredDay[cooldownKey] === state.day) return state

  const key = buildRelationshipKey(PLAYER_ID, npcId)
  const reverseKey = buildRelationshipKey(npcId, PLAYER_ID)
  const current = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const reverse = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const currentStage = current.intimacyStage ?? 'none'

  let next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: {
        ...current,
        affinity: Math.min(100, current.affinity + (currentStage === 'attachment' ? 3 : 4)),
        trust: Math.min(100, current.trust + 4),
        respect: Math.min(100, current.respect + 1),
        fear: Math.max(-100, current.fear - 2),
      },
      [reverseKey]: {
        ...reverse,
        affinity: Math.min(100, reverse.affinity + 2),
        trust: Math.min(100, reverse.trust + 2),
        loyalty: Math.min(100, (reverse.loyalty ?? 0) + 1),
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
  const message = `You make time to court ${npc.name}. ${stageLabel(beforeStage)}${advanced ? ` The bond advances to ${afterStage}.` : ''}`

  next = appendActivityLogEntry(next, 'system', message)
  next.activityLog[0]!.id = `courtship::${npcId}::${state.day}::${state.timeSlot}`

  return next
}
