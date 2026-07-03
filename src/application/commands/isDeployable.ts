import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { MIN_DEPLOYABLE_HEALTH } from './combatConsts'
import { isSeriousInjury } from './recovery'

/**
 * Returns true if an NPC is eligible for squad deployment.
 * Single source of truth for all deployment guard sites.
 */
export function isDeployable(npc: NpcRuntimeState): boolean {
  if (npc.states.health < MIN_DEPLOYABLE_HEALTH) return false
  if (isSeriousInjury(npc.states.injury)) return false
  if (npc.assignment === 'working') return false
  if (npc.assignment === 'training') return false
  if (npc.assignment === 'recovering') return false
  if (npc.assignment === 'assigned_title') return false
  if (npc.assignment === 'transferred') return false
  return true
}
