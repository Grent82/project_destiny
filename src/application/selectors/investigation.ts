import { getInvestigationApproachesForQuest } from '../commands/investigationProfiles'
import type { InvestigationApproach } from '../commands/investigation'

/**
 * Returns the full list of investigation approaches available to the player.
 *
 * INVESTIGATION_APPROACHES is static content — not state-derived — so this
 * selector returns the constant directly. The abstraction keeps UI screens from
 * reaching into application/commands.
 */
export function selectInvestigationApproaches(
  questId?: string | null,
): readonly InvestigationApproach[] {
  return getInvestigationApproachesForQuest(questId)
}
