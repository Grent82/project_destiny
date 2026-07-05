import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import { appendActivityLogEntry } from '../activityLog'
import {
  findNpcInventoryItemByTag,
  consumeNpcInventoryItem,
  resolveItemHealEffect,
  resolveItemStatEffect,
  type FoundInventoryItem,
} from '../npcInventoryHelpers'

/**
 * NPC self-administered consumables (destiny-bkln.9iox): NPCs use medkits/rations from their own
 * inventory instead of these items being player-only. Health is the more urgent survival need, so
 * it takes priority over hunger when both thresholds are crossed. No conflict with the existing
 * eat-meal/drink handlers: only one intention is ever assigned per idle NPC per day
 * (processAllowlistedNpcIntentions), so use-consumable simply competes as a candidate alongside
 * them — standard existing pattern, no special-casing needed.
 */

export const LOW_HEALTH_THRESHOLD = 50
export const HIGH_HUNGER_THRESHOLD = 50
const HEALING_TAG = 'healing'
const FOOD_TAG = 'food'

type ConsumableNeed = { kind: 'health'; found: FoundInventoryItem } | { kind: 'hunger'; found: FoundInventoryItem }

function findConsumableNeed(state: GameState, npc: NpcRuntimeState): ConsumableNeed | null {
  if (npc.states.health < LOW_HEALTH_THRESHOLD) {
    const found = findNpcInventoryItemByTag(state, npc.npcId, HEALING_TAG)
    if (found) return { kind: 'health', found }
  }
  if (npc.states.hunger > HIGH_HUNGER_THRESHOLD) {
    const found = findNpcInventoryItemByTag(state, npc.npcId, FOOD_TAG)
    if (found) return { kind: 'hunger', found }
  }
  return null
}

/** Whether this NPC currently has a matching need (low health/high hunger) AND a matching item. */
export function npcCanUseConsumable(state: GameState, npc: NpcRuntimeState): boolean {
  return findConsumableNeed(state, npc) !== null
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/** NPC uses a self-carried consumable item to address their most urgent need. No-ops if none apply. */
export function npcUseConsumable(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const need = findConsumableNeed(state, npc)
  if (!need) return state

  let next = consumeNpcInventoryItem(state, npcId, need.found)

  if (need.kind === 'health') {
    const healValue = resolveItemHealEffect(need.found.itemDef) ?? 25
    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((n) =>
        n.npcId === npcId ? { ...n, states: { ...n.states, health: clampPercent(n.states.health + healValue) } } : n,
      ),
    }
    return appendActivityLogEntry(next, 'system', `${npc.name} uses ${need.found.itemDef.name}, tending to their wounds.`)
  }

  const hungerReduction = resolveItemStatEffect(need.found.itemDef, 'hunger') ?? 30
  next = {
    ...next,
    npcRuntimeStates: next.npcRuntimeStates.map((n) =>
      n.npcId === npcId ? { ...n, states: { ...n.states, hunger: clampPercent(n.states.hunger - hungerReduction) } } : n,
    ),
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} uses ${need.found.itemDef.name} to stave off hunger.`)
}
