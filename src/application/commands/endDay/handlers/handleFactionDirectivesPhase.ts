import type { GameState } from '../../../../domain'
import { generateFactionDirectives } from '../../factions/directiveAgency'

/**
 * Handles the faction directives phase of endDay.
 * Generates new faction directives for available NPCs based on faction agendas.
 */
export function handleFactionDirectivesPhase(state: GameState): GameState {
  return generateFactionDirectives(state)
}
