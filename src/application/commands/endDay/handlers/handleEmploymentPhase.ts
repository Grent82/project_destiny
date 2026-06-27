import type { GameState } from '../../../../domain'
import { processAllEmployments } from '../../employment'

/**
 * Handles the employment phase of endDay.
 * Processes all active NPC employment contracts:
 * - Starts pending employments
 * - Progresses in-progress employments
 * - Completes or fails employments based on progress and deadlines
 *
 * Priority: Employment runs AFTER faction directives, so faction assignments
 * take precedence over NPC-to-NPC employment.
 */
export function handleEmploymentPhase(state: GameState): GameState {
  return processAllEmployments(state)
}
