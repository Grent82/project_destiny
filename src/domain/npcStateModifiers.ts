import { NPC_STATE_THRESHOLDS as T } from './npcStateThresholds'

export interface NpcStatSnapshot {
  hunger?: number
  fear?: number
  stress?: number
  loyalty?: number
  fatigue?: number
  morale?: number
}

/** Returns accuracy penalty from fatigue (0 or negative) */
export function getFatigueAccuracyPenalty(npc: NpcStatSnapshot): number {
  if ((npc.fatigue ?? 0) > T.FATIGUE_ACCURACY_PENALTY_THRESHOLD) {
    return T.FATIGUE_ACCURACY_PENALTY
  }
  return 0
}

/** Returns skill penalty from hunger (0 or negative) */
export function getHungerCombatPenalty(npc: NpcStatSnapshot): number {
  if ((npc.hunger ?? 0) > T.HUNGER_COMBAT_PENALTY_THRESHOLD) {
    return T.HUNGER_COMBAT_SKILL_PENALTY
  }
  return 0
}

/** Returns whether NPC might refuse advance action due to fear */
export function checkFearRefuseAdvance(npc: NpcStatSnapshot): boolean {
  if ((npc.fear ?? 0) > T.FEAR_REFUSE_ADVANCE_THRESHOLD) {
    return Math.random() * 100 < T.FEAR_REFUSE_ADVANCE_CHANCE
  }
  return false
}

/** Returns whether loyalty is too low for deployment (warning/block) */
export type LoyaltyDeployStatus = 'ok' | 'warning' | 'blocked'
export function getLoyaltyDeployStatus(npc: NpcStatSnapshot): LoyaltyDeployStatus {
  const loyalty = npc.loyalty ?? 100
  if (loyalty <= T.LOYALTY_REFUSE_DEPLOY_THRESHOLD) return 'blocked'
  if (loyalty <= T.LOYALTY_DEPLOY_WARNING_THRESHOLD) return 'warning'
  return 'ok'
}

/** Returns extra morale decay from high stress (0 or negative) */
export function getStressMoraleDecay(npc: NpcStatSnapshot): number {
  if ((npc.stress ?? 0) > T.STRESS_MORALE_DECAY_THRESHOLD) {
    return T.STRESS_MORALE_DECAY_PENALTY
  }
  return 0
}
