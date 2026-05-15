import type { GameState } from '../../domain'
import type { IntimacyStage } from '../../domain/relationships/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
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
 * Returns state unchanged if:
 * - NPC not on roster or not romanceEligible
 * - NPC is a ward, captive, or missing
 * - Relationship axes don't meet the threshold for the next stage
 * - Already at 'committed' (terminal stage)
 */
export function advanceRomanceArc(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Exclude wards, captives, and missing NPCs
  if (npc.status === 'ward') return state
  if (npc.captivityState?.status === 'missing' || npc.captivityState?.status === 'captive') return state

  // Check romanceEligible flag on NPC definition
  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef?.romanceEligible) return state

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

  // Require mutual romantic bond type at attachment → committed transition
  if (currentStage === 'attachment') {
    if (playerToNpc.bondType !== 'romantic' || npcToPlayer.bondType !== 'romantic') return state
    // Guard: respect proxy for resentment (very negative respect = antagonism)
    if (playerToNpc.respect < -20) return state
  }

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

  return appendActivityLogEntry(
    next,
    'system',
    `${npc.name}: what began as duty has become ${stageLabel[target]}.`,
  )
}
