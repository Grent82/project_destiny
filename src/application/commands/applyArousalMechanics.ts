/**
 * applyArousalMechanics Command
 *
 * Handles daily arousal mechanics for NPCs:
 * - Decay: Arousal decreases by 10% per day
 * - Proximity boost: If NPC is near romantic partner, arousal increases
 * - Cooldown: Arousal cannot be triggered again until cooldown expires
 *
 * Called during endDay cycle after intentions are processed.
 */

import type { GameState } from '../../domain'
import { appendActivityLogEntry } from '../commands/activityLog'

/**
 * Applies daily arousal mechanics to all NPCs.
 */
export function applyArousalMechanics(state: GameState): GameState {
  let newState = state

  for (const npc of state.roster) {
    const arousal = npc.arousalState ?? { level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null }
    const currentDay = state.day

    // Apply decay: 10% per day
    let newLevel = Math.max(0, Math.round(arousal.level * 0.9))

    // Check cooldown
    const cooldownExpired = arousal.cooldownUntilDay === null || currentDay >= arousal.cooldownUntilDay

    // Check proximity to romantic partner
    // Proximity boost only applies if cooldown expired
    if (cooldownExpired) {
      const partnerId = getRomanticPartnerId(state, npc.npcId)
      if (partnerId) {
        const partner = state.roster.find((n) => n.npcId === partnerId)
        if (partner && areNpcsInSameRoom(state, npc.npcId, partner.npcId)) {
          // Proximity boost: +5 arousal when near partner (after decay)
          newLevel = Math.min(100, newLevel + 5)

          // Log significant arousal increases
          if (newLevel > arousal.level) {
            newState = appendActivityLogEntry(
              newState,
              'system',
              `${npc.name} zeigt Anzeichen von Erregung in der Nähe von ${partner.name}.`,
            )
          }
        }
      }
    }

    // Update arousal state
    if (newLevel !== arousal.level) {
      newState = {
        ...newState,
        roster: newState.roster.map((n) =>
          n.npcId === npc.npcId
            ? {
                ...n,
                arousalState: {
                  ...arousal,
                  level: newLevel,
                  lastTriggerDay: newLevel > arousal.level ? currentDay : arousal.lastTriggerDay,
                  cooldownUntilDay: newLevel > arousal.level ? currentDay + 3 : arousal.cooldownUntilDay,
                },
              }
            : n,
        ),
      }
    }
  }

  return newState
}

/**
 * Finds the romantic partner ID for an NPC based on relationship intimacy stage.
 */
function getRomanticPartnerId(state: GameState, npcId: string): string | null {
  // Find the relationship with highest intimacy stage
  let bestPartner: string | null = null
  let bestStage = -1

  const intimacyStages = ['none', 'affinity', 'attachment', 'committed']

  for (const relKey of Object.keys(state.relationships)) {
    if (!relKey.startsWith(`${npcId}-to-`)) continue

    const partnerId = relKey.split('-to-')[1]
    const rel = state.relationships[relKey]
    const stage = rel?.intimacyStage ?? 'none'
    const stageIndex = intimacyStages.indexOf(stage)

    if (stageIndex > bestStage && stageIndex > 0) {
      bestStage = stageIndex
      bestPartner = partnerId
    }
  }

  return bestPartner
}

/**
 * Checks if two NPCs are in the same room.
 */
function areNpcsInSameRoom(state: GameState, npcId1: string, npcId2: string): boolean {
  const npc1 = state.roster.find((n) => n.npcId === npcId1)
  const npc2 = state.roster.find((n) => n.npcId === npcId2)

  if (!npc1 || !npc2) return false
  if (!npc1.roomAssignment || !npc2.roomAssignment) return false

  return npc1.roomAssignment === npc2.roomAssignment
}
