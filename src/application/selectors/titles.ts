import type { RootState } from '../store/gameStore'
import { getTitleDefinitions } from '../content/contentCatalog'
import type { TitleDefinition } from '../../domain/titles/contracts'

export function selectTitleEligibilityForNpc(
  npcId: string,
): (state: RootState) => {
  eligible: TitleDefinition[]
  ineligible: Array<TitleDefinition & { reason: string }>
} {
  return (state: RootState) => {
    const npcRuntime = state.game.roster.find((r) => r.npcId === npcId)
    const titles = getTitleDefinitions()

    if (!npcRuntime) return { eligible: [], ineligible: [] }

    const skills = npcRuntime.skills as Record<string, number>

    return titles.reduce<{
      eligible: TitleDefinition[]
      ineligible: Array<TitleDefinition & { reason: string }>
    }>(
      (acc, title) => {
        const skill = skills[title.requiredSkill] ?? 0
        if (skill >= title.requiredSkillThreshold) {
          acc.eligible.push(title)
        } else {
          acc.ineligible.push({
            ...title,
            reason: `Requires ${title.requiredSkill} ${title.requiredSkillThreshold} (has ${skill})`,
          })
        }
        return acc
      },
      { eligible: [], ineligible: [] },
    )
  }
}
