import type { GameState } from "../../../domain"
import type { Rng } from "../seededRng"

/**
 * End-of-day execution phases with explicit boundaries.
 * Order matters: economic obligations first, then decay, then agency, then world systems.
 */
export const EndDayPhase = {
  WAGES: "wages",
  DECAY: "decay",
  CORRIDOR: "corridor",
  RESOURCES: "resources",
  CONSEQUENCES: "consequences",
  TIME_ADVANCE: "time-advance",
  POLITICS: "politics",
  EVENTS: "events",
  SOCIAL_SIMULATION: "social-simulation",
  PERSONALITY: "personality",
  PAIRING: "pairing",
  BONDING: "bonding",
  CAPTIVITY: "captivity",
  QUESTS: "quests",
  FACTION_DIRECTIVES: "faction-directives",
} as const

export type PhaseHandler = (state: GameState) => GameState

export type PhaseHandlerWithRng = (state: GameState, rng: Rng) => GameState

export type PhaseHandlerWithSeeded = (state: GameState, rng: Rng, seeded: { rng: Rng; getSeed: () => number }) => GameState
