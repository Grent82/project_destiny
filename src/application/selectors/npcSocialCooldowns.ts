/**
 * Reports whether an NPC's once-per-day private social actions (Talk Deeply, Court) have
 * already fired today, so the UI can disable the button and explain why instead of letting
 * the player click a button that looks live but silently no-ops.
 *
 * Mirrors the exact lastFiredDay cooldown keys the commands themselves write
 * (see commands/deepConversation.ts and commands/courtNpc.ts) without duplicating their
 * internal topic-selection logic: deepConversation's cooldown key is topic-scoped
 * (`deep-conv-player-{npcId}-{day}-{topic}`), but only one topic can ever fire per NPC per
 * day, so checking for any key with today's prefix is equivalent to picking the exact topic
 * and is robust to that selection logic changing later.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'

export interface NpcSocialCooldowns {
  deepConversationOnCooldown: boolean
  courtshipOnCooldown: boolean
}

function hasFiredToday(lastFiredDay: Record<string, number>, keyPrefix: string, day: number): boolean {
  return Object.entries(lastFiredDay).some(([key, firedOnDay]) => firedOnDay === day && key.startsWith(keyPrefix))
}

function computeCooldowns(lastFiredDay: Record<string, number>, day: number, npcId: string): NpcSocialCooldowns {
  return {
    deepConversationOnCooldown: hasFiredToday(lastFiredDay, `deep-conv-player-${npcId}-${day}-`, day),
    courtshipOnCooldown: lastFiredDay[`courtship-player-${npcId}-${day}`] === day,
  }
}

const cooldownSelectorCache = new Map<string, (state: RootState) => NpcSocialCooldowns>()

export const selectNpcSocialCooldowns = (npcId: string) => {
  let selector = cooldownSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector(
      [(state: RootState) => state.game.lastFiredDay, (state: RootState) => state.game.day],
      (lastFiredDay, day) => computeCooldowns(lastFiredDay, day, npcId),
    )
    cooldownSelectorCache.set(npcId, selector)
  }
  return selector
}
