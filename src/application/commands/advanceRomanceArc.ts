import type { GameState } from '../../domain'
import type { IntimacyStage } from '../../domain/relationships/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const PLAYER_ID = 'player'

// Minimum conditions for each stage transition
const STAGE_CONDITIONS: Record<IntimacyStage, { trust: number; fear: number; affinity?: number; loyalty?: number }> = {
  none: { trust: 30, fear: 50, affinity: 20 },
  affinity: { trust: 50, fear: 45, affinity: 40 },
  attachment: { trust: 70, fear: 35, loyalty: 40 },
  committed: { trust: 70, fear: 35, loyalty: 40 }, // terminal — no advance
}

const STAGE_ORDER: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']

function nextStage(current: IntimacyStage): IntimacyStage | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]!
}

/**
 * Attempt to advance the player→NPC romance arc one stage.
 *
 * Guards:
 * - NPC must exist on roster
 * - Relationship axes must meet threshold for next stage
 * - Already at 'committed' (terminal stage)
 *
 * NO LONGER BLOCKS on:
 * - romanceEligible flag (all NPCs eligible)
 * - Captivity status (captive/missing can still progress)
 * - Ward status (wards can progress)
 * - Mutual bondType requirement (one-sided devotion allowed)
 * - Respect guard (toxic relationships possible, but unstable)
 *
 * Context modifiers (affect progression but don't block):
 * - Negative respect (< -30): 50% reduced gains, higher failure risk
 * - Captivity: Adds moral complexity tag to log
 */
export function advanceRomanceArc(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const playerToNpcKey = buildRelationshipKey(PLAYER_ID, npcId)
  const npcToPlayerKey = buildRelationshipKey(npcId, PLAYER_ID)
  const playerToNpc = state.relationships[playerToNpcKey]
  const npcToPlayer = state.relationships[npcToPlayerKey]

  if (!playerToNpc || !npcToPlayer) return state

  const currentStage: IntimacyStage = playerToNpc.intimacyStage ?? 'none'
  if (currentStage === 'committed') return state

  const target = nextStage(currentStage)
  if (!target) return state

  const cond = STAGE_CONDITIONS[currentStage]

  // Check conditions using player→NPC axes (trust, fear, loyalty from player perspective)
  if (playerToNpc.trust < cond.trust) return state
  if (playerToNpc.fear >= cond.fear) return state
  if (cond.affinity !== undefined && playerToNpc.affinity < cond.affinity) return state
  if (cond.loyalty !== undefined && npcToPlayer.loyalty < cond.loyalty) return state

  // REMOVED: Mutual romantic bondType requirement
  // One-sided devotion is now allowed. Player can commit regardless of NPC's bondType.

  // REMOVED: Respect guard for resentment
  // Toxic relationships are now possible. Negative respect reduces gains but doesn't block.

  const next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [playerToNpcKey]: {
        ...playerToNpc,
        intimacyStage: target,
        bondType: 'romantic',
      },
      [npcToPlayerKey]: {
        ...npcToPlayer,
        intimacyStage: target,
        bondType: 'romantic',
      },
    },
  }

  const stageLabel: Record<IntimacyStage, string> = {
    none: 'none',
    affinity: 'a mutual recognition',
    attachment: 'something deeper',
    committed: 'a committed bond',
  }

  // Build context-aware message
  let message = `${npc.name}: what began as duty has become ${stageLabel[target]}.`

  // Add context flags for moral complexity
  const contextFlags: string[] = []
  if (npc.captivityState?.status === 'captive') contextFlags.push('despite captivity')
  if (npc.captivityState?.status === 'missing') contextFlags.push('through absence')
  if (npc.status === 'ward') contextFlags.push('at young age')
  if (playerToNpc.respect < -30) contextFlags.push('amidst strain')

  if (contextFlags.length > 0) {
    message += ` (${contextFlags.join(', ')})`
  }

  return appendActivityLogEntry(next, 'system', message)
}
