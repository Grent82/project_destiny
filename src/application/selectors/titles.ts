import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { getTitleDefinitions } from '../content/contentCatalog'
import type { TitleDefinition } from '../../domain/titles/contracts'

export function selectTitleEligibilityForNpc(
  npcId: string,
): (state: RootState) => {
  eligible: TitleDefinition[]
  ineligible: Array<TitleDefinition & { reason: string }>
} {
  let selector = titleEligibilitySelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector(
      [(state: RootState) => state.game.roster],
      (roster) => {
        const npcRuntime = roster.find((r) => r.npcId === npcId)
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
      },
    )
    titleEligibilitySelectorCache.set(npcId, selector)
  }
  return selector
}

const titleEligibilitySelectorCache = new Map<
  string,
  (state: RootState) => { eligible: TitleDefinition[]; ineligible: Array<TitleDefinition & { reason: string }> }
>()
