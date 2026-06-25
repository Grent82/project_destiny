import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { advanceRomanceArc } from './advanceRomanceArc'

const PLAYER_ID = 'player'

function canCourtNpc(state: GameState, npcId: string) {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  // All NPCs are romance-eligible. Context (deployment, captivity, ward) affects gains, not eligibility.
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

/**
 * Court an NPC — build relationship through direct attention.
 *
 * Guards:
 * - NPC must exist on roster
 * - Player must be at the house (currentDistrictId === houseDistrictId)
 *
 * Context modifiers (do not block, but affect outcomes):
 * - Deployment: NPC gets 50% reduced intimacy gains (less time together)
 * - Captivity: Adds 'risk' tag to activity log (moral ambiguity)
 * - Ward: No mechanical effect, but age-band shown in UI as narrative info
 * - Negative respect (< -30): 50% reduced gains (instability)
 */
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

  // Calculate gain multiplier based on context
  let gainMultiplier = 1.0

  // Deployment penalty: less time together = reduced intimacy gains
  if (npc.assignment === 'deployed') {
    gainMultiplier *= 0.5
  }

  // Negative respect penalty: instability reduces gains
  if (current.respect < -30) {
    gainMultiplier *= 0.5
  }

  // Apply gains with multiplier
  const affinityGain = Math.max(1, Math.round(currentStage === 'attachment' ? 3 : 4) * gainMultiplier)
  const trustGain = Math.max(1, Math.round(4 * gainMultiplier))
  const respectGain = Math.max(0, Math.round(1 * gainMultiplier))
  const fearReduction = gainMultiplier >= 1 ? 2 : 1

  let next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: {
        ...current,
        affinity: Math.min(100, current.affinity + affinityGain),
        trust: Math.min(100, current.trust + trustGain),
        respect: Math.min(100, current.respect + respectGain),
        fear: Math.max(-100, current.fear - fearReduction),
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

  // Build context-aware message
  const contextFlags: string[] = []
  if (npc.assignment === 'deployed') contextFlags.push('on deployment')
  if (npc.captivityState?.status === 'captive') contextFlags.push('in captivity')
  if (npc.captivityState?.status === 'missing') contextFlags.push('missing')
  if (npc.status === 'ward') contextFlags.push('young')
  if (current.respect < -30) contextFlags.push('strained relationship')

  let message = `You make time to court ${npc.name}. ${stageLabel(beforeStage)}`
  if (contextFlags.length > 0) {
    message += ` (Context: ${contextFlags.join(', ')})`
  }
  if (advanced) {
    message += ` The bond advances to ${afterStage}.`
  }
  if (gainMultiplier < 1) {
    message += ` Gains reduced due to circumstances.`
  }

  next = appendActivityLogEntry(next, 'system', message)
  next.activityLog[0]!.id = `courtship::${npcId}::${state.day}::${state.timeSlot}`

  return next
}
