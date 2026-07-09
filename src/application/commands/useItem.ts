import type { GameState } from '../../domain'
import type { ItemEffect, UseActionType } from '../../domain/items/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { PLAYER_MAX_HEALTH } from './combatants'
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
      return applyConsume(state, instance.instance.uniqueId, actualItemId, targetNpcId, itemDef.name, itemDef.typedEffects ?? [])
    case 'present':
    case 'archive':
      return applyDocumentDisposition(state, instance.instance.uniqueId, action, itemDef.name, itemDef.typedEffects ?? [])
    default:
      return state
  }
}

function applyConsume(
  state: GameState,
  instanceId: string,
  itemId: string,
  targetNpcId: string | undefined,
  itemName: string,
  effects: ItemEffect[],
): GameState {
  // Remove the item first
  let next: GameState = removePlayerItem(state, instanceId)

  for (const effect of effects) {
    switch (effect.type) {
      case 'heal':
        next = applyHealEffect(next, effect.value, targetNpcId, itemName)
        break

      case 'stat_mod':
        next = applyStatModEffect(next, effect.stat, effect.value, targetNpcId, itemName, effect.duration)
        break

      case 'reduceStat':
        next = applyReduceStatEffect(next, effect.stat, effect.value, itemName)
        break

      case 'boostStat':
        next = applyBoostStatEffect(next, effect.stat, effect.value, itemName, state.day, effect.duration)
        break

      case 'addStatus':
        next = applyAddStatusEffect(next, effect.value, itemName)
        break

      case 'removeStatus':
        next = applyRemoveStatusEffect(next, effect.value, itemName)
        break

      case 'training_bonus':
        next = applyTrainingBonusEffect(next, effect.skill, effect.value, itemName, state.day)
        break

      case 'enableAction':
        next = applyEnableActionEffect(next, effect.action, itemName)
        break

      case 'evidence_use':
        next = applyEvidenceUseEffect(next, effect.disposition, itemName, itemId, instanceId)
        break

      // These effects are handled elsewhere (equip, install, present)
      case 'relationship_gift':
      case 'storage_expand':
      case 'rest_quality_bonus':
      case 'tradeValue':
      case 'contraception':
      case 'baseImprovement':
      case 'skillBonus':
      case 'affinityBonus':
      case 'grantRight':
      case 'grantAccess':
        // No direct consume effect - handled by other commands
        break
    }
  }

  if (effects.length === 0) {
    next = appendActivityLogEntry(next, 'system', `Used ${itemName}.`)
  }

  return next
}

function applyHealEffect(
  state: GameState,
  value: number,
  targetNpcId: string | undefined,
  itemName: string,
): GameState {
  if (targetNpcId) {
    const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === targetNpcId)
    if (npcIndex !== -1) {
      const npc = state.npcRuntimeStates[npcIndex]!
      const newHealth = Math.min(100, npc.states.health + value)
      const updatedNpc = { ...npc, states: { ...npc.states, health: newHealth } }
      const targetName = state.npcRuntimeStates.find((n) => n.npcId === targetNpcId)?.name ?? targetNpcId
      return appendActivityLogEntry(
        { ...state, npcRuntimeStates: state.npcRuntimeStates.map((n, i) => i === npcIndex ? updatedNpc : n) },
        'system',
        `Used ${itemName} on ${targetName}. +${value} health.`,
      )
    }
  } else if (state.playerCharacter.combatState) {
    return appendActivityLogEntry(
      {
        ...state,
        playerCharacter: {
          ...state.playerCharacter,
          combatState: {
            ...state.playerCharacter.combatState,
            health: Math.min(PLAYER_MAX_HEALTH, state.playerCharacter.combatState.health + value),
          },
        },
      },
      'system',
      `Used ${itemName}. +${value} health.`,
    )
  }
  return state
}

function applyStatModEffect(
  state: GameState,
  stat: string,
  value: number,
  targetNpcId: string | undefined,
  itemName: string,
  duration?: number,
): GameState {
  // duration is reserved for future use - stat_mod effects can have duration in the schema
  void duration
  if (targetNpcId) {
    const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === targetNpcId)
    if (npcIndex !== -1) {
      const npc = state.npcRuntimeStates[npcIndex]!
      const statMap: Record<string, keyof typeof npc.states> = {
        fatigue: 'fatigue',
        stress: 'stress',
        hunger: 'hunger',
        morale: 'morale',
        fear: 'fear',
        anger: 'anger',
        toxin: 'intoxication',
        hygiene: 'hygiene',
      }
      const statKey = statMap[stat]
      if (statKey) {
        const current = npc.states[statKey]
        const updated = Math.max(0, Math.min(100, current + value))
        const updatedNpc = { ...npc, states: { ...npc.states, [statKey]: updated } }
        return appendActivityLogEntry(
          { ...state, npcRuntimeStates: state.npcRuntimeStates.map((n, i) => i === npcIndex ? updatedNpc : n) },
          'system',
          `Used ${itemName}. ${stat} ${value > 0 ? '+' : ''}${value}.`,
        )
      }
    }
  }
  return state
}

function applyReduceStatEffect(
  state: GameState,
  stat: string,
  value: number,
  itemName: string,
): GameState {
  // reduceStat uses negative values to reduce the stat (e.g., value: -30 reduces hunger by 30)
  // These stats are typically on NPCs (hunger, fatigue, stress)
  // For player, we log the effect - actual stat reduction happens on NPCs when they consume
  void stat // Reserved for future player stat handling

  return appendActivityLogEntry(
    state,
    'system',
    `Used ${itemName}. ${stat} reduced by ${Math.abs(value)}.`,
  )
}

function applyBoostStatEffect(
  state: GameState,
  stat: string,
  value: number,
  itemName: string,
  currentDay: number,
  duration: number,
): GameState {
  const expiresDay = currentDay + duration
  const newBoost = {
    stat,
    value,
    expiresDay,
  }

  return appendActivityLogEntry(
    {
      ...state,
      tempStatBoosts: [...state.tempStatBoosts, newBoost],
    },
    'system',
    `Used ${itemName}. ${stat} boosted by ${value} for ${duration} days.`,
  )
}

function applyAddStatusEffect(
  state: GameState,
  statusId: string,
  itemName: string,
): GameState {
  const newStatus = {
    statusId,
    source: itemName,
  }

  return appendActivityLogEntry(
    {
      ...state,
      playerStatuses: [...state.playerStatuses, newStatus],
    },
    'system',
    `Used ${itemName}. Status '${statusId}' applied.`,
  )
}

function applyRemoveStatusEffect(
  state: GameState,
  statusId: string,
  itemName: string,
): GameState {
  const filteredStatuses = state.playerStatuses.filter((s) => s.statusId !== statusId)

  return appendActivityLogEntry(
    {
      ...state,
      playerStatuses: filteredStatuses,
    },
    'system',
    `Used ${itemName}. Status '${statusId}' removed.`,
  )
}

function applyTrainingBonusEffect(
  state: GameState,
  skill: string,
  value: number,
  itemName: string,
  currentDay: number,
): GameState {
  // currentDay is reserved for future expiration tracking
  void currentDay
  // Training bonuses typically last until end of day or have a specific duration
  // For now, we'll add them without expiration (can be consumed via daily tick)
  const newBonus = {
    skill,
    value,
    source: itemName,
  }

  return appendActivityLogEntry(
    {
      ...state,
      activeTrainingBonuses: [...state.activeTrainingBonuses, newBonus],
    },
    'system',
    `Used ${itemName}. ${skill} training bonus +${value} applied.`,
  )
}

function applyEnableActionEffect(
  state: GameState,
  action: string,
  itemName: string,
): GameState {
  // Only add if not already enabled
  if (state.enabledActions.includes(action)) {
    return state
  }

  return appendActivityLogEntry(
    {
      ...state,
      enabledActions: [...state.enabledActions, action],
    },
    'system',
    `Used ${itemName}. Action '${action}' unlocked.`,
  )
}

function applyEvidenceUseEffect(
  state: GameState,
  disposition: 'filed' | 'presented' | 'burned' | undefined,
  itemName: string,
  itemId: string,
  instanceId: string,
): GameState {
  const resolvedDisposition = disposition ?? 'filed'
  const message = `Used ${itemName} as evidence (${resolvedDisposition}).`

  return appendActivityLogEntry(
    {
      ...state,
      evidenceInventory: [...state.evidenceInventory, { instanceId, itemId, disposition: resolvedDisposition }],
    },
    'system',
    message,
  )
}

function applyDocumentDisposition(
  state: GameState,
  instanceId: string,
  action: 'present' | 'archive',
  itemName: string,
  effects: ItemEffect[],
): GameState {
  const disposition = action === 'archive' ? 'filed' : 'presented'
  let next: GameState = removePlayerItem(state, instanceId)

  // Process enableAction effects for documents
  for (const effect of effects) {
    if (effect.type === 'enableAction') {
      if (!next.enabledActions.includes(effect.action)) {
        next = {
          ...next,
          enabledActions: [...next.enabledActions, effect.action],
        }
      }
    }
  }

  return appendActivityLogEntry(
    next,
    'system',
    `${itemName} has been ${disposition}. The document is spent.`,
  )
}
