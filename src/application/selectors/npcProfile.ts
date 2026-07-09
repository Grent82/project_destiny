import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { BondStatus, NpcMotivation, NpcQuirk } from '../../domain/npc/contracts'
import type { RelationshipAxes } from '../../domain/relationships/contracts'
import { getRelationship } from '../../domain/relationships/contracts'
import { selectRosterDetail } from './roster'

/** Heir status of an NPC who has been formally recognized by the house. */
export interface NpcHeirStatus {
  heirId: string
  stage: string
  legitimacyStatus: string
  origin?: string
}

/** Active combat snapshot for an NPC currently engaged in a fight. */
export interface NpcCombatSnapshot {
  health: number
  maxHealth: number
  isAlly: boolean
}

/**
 * Full NPC profile — the canonical merge of all 6 data sources:
 * state.npcRuntimeStates, state.relationships, state.house.houseHeirs,
 * state.activeCombat, contentCatalog.npcsById, contentCatalog.dialogueTreesById.
 *
 * Use this in any component that needs a complete view of one NPC.
 * Specialized selectors (title eligibility, gift history, etc.) may
 * compose this or remain independent for their narrow use cases.
 */
export interface FullNpcProfile {
  // ── Core identity (runtime + content catalog) ──────────────────────────
  npcId: string
  name: string
  origin: string
  background: string
  status: string
  rarity: string
  motivation?: NpcMotivation
  ageBand?: string
  sex?: string
  appearanceTags: string[]
  quirks: NpcQuirk[]
  signature: string
  factionAffinity: string | null
  factionAffinityId: string | null
  allowedTitleIds: string[]
  // ── Assignment & titles ─────────────────────────────────────────────────
  assignment: string
  activeTitle: string | null
  trainingFocus: string | null
  wagesOwedDays: number
  // ── Stats ───────────────────────────────────────────────────────────────
  attributes: {
    might: number; agility: number; endurance: number; intellect: number
    perception: number; presence: number; resolve: number
  }
  skills: {
    melee: number; ranged: number; medicine: number; administration: number
    engineering: number; negotiation: number; survival: number; security: number
    crafting: number; performance: number; academics: number; intrigue: number
  }
  traits: {
    discipline: number; ambition: number; empathy: number; ruthlessness: number
    prudence: number; curiosity: number; dominance: number; loyalty: number
    vanity: number; zeal: number
  }
  states: {
    health: number; fatigue: number; stress: number; morale: number
    fear: number; anger: number; hunger: number;
    intoxication: number; hygiene: number
  }
  loadout: { primaryWeaponId: string | null; secondaryWeaponId: string | null; armorId: string | null }
  // ── Bond service ────────────────────────────────────────────────────────
  bondStatus: BondStatus | null
  // ── Memory ──────────────────────────────────────────────────────────────
  npcMemory: Array<{ day: number; event: string; participants?: string[]; axisDelta?: Record<string, number> }>
  // ── Relationships ───────────────────────────────────────────────────────
  /** Directed player → npc axes (loyalty, trust, affinity, respect, fear). */
  playerToNpc: RelationshipAxes
  /** Directed npc → player axes. */
  npcToPlayer: RelationshipAxes
  // ── Succession ──────────────────────────────────────────────────────────
  heirStatus: NpcHeirStatus | null
  // ── Active combat ────────────────────────────────────────────────────────
  combatSnapshot: NpcCombatSnapshot | null
}

/**
 * Returns the full merged NPC profile for `npcId`, or null if the NPC
 * is not on the roster.
 */
export function selectFullNpcProfile(state: RootState, npcId: string): FullNpcProfile | null {
  const base = selectRosterDetail(state, npcId)
  if (!base) return null

  const runtime = state.game.npcRuntimeStates.find((n) => n.npcId === npcId)!

  // Relationship axes
  const playerToNpc = getRelationship(state.game.relationships, 'player', npcId)
  const npcToPlayer = getRelationship(state.game.relationships, npcId, 'player')

  // Heir status
  const heir = state.game.house.houseHeirs?.find((h) => h.id === npcId) ?? null
  const heirStatus: NpcHeirStatus | null = heir
    ? { heirId: heir.id, stage: heir.stage, legitimacyStatus: heir.legitimacyStatus, origin: heir.origin }
    : null

  // Active combat snapshot
  let combatSnapshot: NpcCombatSnapshot | null = null
  if (state.game.activeCombat) {
    const combatant = state.game.activeCombat.combatants.find(
      (c) => c.sourceNpcId === npcId,
    )
    if (combatant) {
      combatSnapshot = {
        health: combatant.health,
        maxHealth: combatant.maxHealth,
        isAlly: combatant.side === 'allies',
      }
    }
  }

  return {
    ...base,
    bondStatus: runtime.bondStatus ?? null,
    npcMemory: runtime.npcMemory ?? [],
    playerToNpc,
    npcToPlayer,
    heirStatus,
    combatSnapshot,
  }
}

/**
 * Memoized selector factory: creates a stable selector per npcId to avoid
 * unnecessary re-renders. Used with useAppSelector.
 *
 * Example: const selector = useMemo(() => createSelectFullNpcProfile(npcId), [npcId])
 *          const profile = useAppSelector(selector)
 */
export function createSelectFullNpcProfile(npcId: string) {
  return createSelector(
    (state: RootState) => state.game.npcRuntimeStates,
    (state: RootState) => state.game.relationships,
    (state: RootState) => state.game.house.houseHeirs,
    (state: RootState) => state.game.activeCombat,
    (state: RootState) => state,
    (_, __, ___, ____, fullState) => selectFullNpcProfile(fullState, npcId),
  )
}
