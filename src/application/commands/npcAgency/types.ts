/** Shared types for NPC agency modules. */
import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'

/** Agency action types that NPCs can perform while working. */
export type AgencyAction = 'rumor' | 'incident' | 'contact' | 'faction_favor' | 'npc_bond' | 'spend_marks' | 'district_move'

/** Initiative action types for arc-initiator NPCs. */
export type InitiativeAction = 'district_lever' | 'npc_approach' | 'faction_position' | 'resource_move'

/** Context passed to agency modules. */
export interface AgencyContext {
  state: GameState
  rng: Rng
  day: number
}

/** Handler signature for agency modules. */
export type AgencyHandler = (state: GameState, rng: Rng) => GameState

/** Initiative handler signature. */
export type InitiativeHandler = (state: GameState, rng: Rng) => GameState
