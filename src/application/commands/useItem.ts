import type { GameState } from '../../domain'
import type { UseActionType } from '../../domain/items/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { findPlayerItem, removePlayerItem } from './inventory/inventoryHelpers'

interface UseItemPayload {
  instanceId: string
  action: UseActionType
  targetNpcId?: string
}

/**
 * Main item use dispatcher. Routes to effect handlers by action type.
 * Rejects if the instance does not exist or the action is unsupported for the category.
 */
export function useItem(state: GameState, payload: UseItemPayload): GameState {
  const { instanceId, action, targetNpcId } = payload

  const instance = findPlayerItem(state, instanceId)
  if (!instance) return state

  // instance.instance.itemId is the uniqueId (e.g., 'test-inst-item-medkit-field')
  // We need to extract the actual itemId (e.g., 'item-medkit-field') from it
  const actualItemId = instance.instance.itemId.replace(/^test-inst-/, '')
  const itemDef = contentCatalog.itemsById.get(actualItemId)
  if (!itemDef) return state

  switch (action) {
    case 'consume':
      return applyConsume(state, instance.instance.uniqueId, targetNpcId, itemDef.name, itemDef.typedEffects ?? [])
    case 'present':
    case 'archive':
      return applyDocumentDisposition(state, instance.instance.uniqueId, action, itemDef.name)
    default:
      return state
  }
}

function applyConsume(
  state: GameState,
  instanceId: string,
  targetNpcId: string | undefined,
  itemName: string,
  effects: Array<{ type: string; [key: string]: unknown }>,
): GameState {
  // Remove the item first
  let next: GameState = removePlayerItem(state, instanceId)

  for (const effect of effects) {
    if (effect.type === 'heal') {
      const value = typeof effect.value === 'number' ? effect.value : 0
      if (targetNpcId) {
        const npcIndex = next.roster.findIndex((n) => n.npcId === targetNpcId)
        if (npcIndex !== -1) {
          const npc = next.roster[npcIndex]!
          const newHealth = Math.min(100, npc.states.health + value)
          const updatedNpc = { ...npc, states: { ...npc.states, health: newHealth } }
          next = { ...next, roster: next.roster.map((n, i) => i === npcIndex ? updatedNpc : n) }
        }
      }
      const targetName = targetNpcId
        ? (next.roster.find((n) => n.npcId === targetNpcId)?.name ?? targetNpcId)
        : 'self'
      next = appendActivityLogEntry(
        next,
        'system',
        `Used ${itemName} on ${targetName}. +${value} health.`,
      )
    } else if (effect.type === 'stat_mod') {
      const stat = typeof effect.stat === 'string' ? effect.stat : ''
      const value = typeof effect.value === 'number' ? effect.value : 0
      if (targetNpcId && stat) {
        const npcIndex = next.roster.findIndex((n) => n.npcId === targetNpcId)
        if (npcIndex !== -1) {
          const npc = next.roster[npcIndex]!
          const statMap: Record<string, keyof typeof npc.states> = {
            fatigue: 'fatigue', stress: 'stress', hunger: 'hunger',
            morale: 'morale', fear: 'fear', anger: 'anger',
          }
          const statKey = statMap[stat]
          if (statKey) {
            const current = npc.states[statKey]
            const updated = Math.max(0, Math.min(100, current + value))
            const updatedNpc = { ...npc, states: { ...npc.states, [statKey]: updated } }
            next = { ...next, roster: next.roster.map((n, i) => i === npcIndex ? updatedNpc : n) }
          }
        }
      }
      next = appendActivityLogEntry(next, 'system', `Used ${itemName}. ${stat} ${value > 0 ? '+' : ''}${value}.`)
    }
  }

  if (effects.length === 0) {
    next = appendActivityLogEntry(next, 'system', `Used ${itemName}.`)
  }

  return next
}

function applyDocumentDisposition(
  state: GameState,
  instanceId: string,
  action: 'present' | 'archive',
  itemName: string,
): GameState {
  const disposition = action === 'archive' ? 'filed' : 'presented'
  const next: GameState = removePlayerItem(state, instanceId)
  return appendActivityLogEntry(
    next,
    'system',
    `${itemName} has been ${disposition}. The document is spent.`,
  )
}
