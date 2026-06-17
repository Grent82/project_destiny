import { createSelector } from '@reduxjs/toolkit'

import type { EventChoice } from '../../domain/events/contracts'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

const selectGame = (state: RootState) => state.game

export const selectPendingEvents = createSelector([selectGame], (game) =>
  game.pendingEvents.filter((event) => event.firedOnDay <= game.day),
)

export const selectPendingEventsCount = (state: RootState) =>
  selectPendingEvents(state).length

export const selectFirstPendingEvent = (state: RootState) => {
  const pending = selectPendingEvents(state)[0]
  if (!pending) return null
  const template = contentCatalog.eventsById.get(pending.eventId)
  return template ?? null
}

export type EventPresentation = {
  eventId: string
  choiceId: string | null
  title: string
  kicker: string
  bodyText: string
  sceneText: string | null
  sourceNpcId: string | null
  actorName: string | null
  actorPortraitSrc: string | null
  districtId: string | null
  districtName: string | null
  choices: EventChoice[]
}

function classifyEventKicker(params: {
  isFirstRun: boolean
  sourceNpcId: string | null
  tags: string[]
  firingMode: 'world' | 'system'
}) {
  if (params.isFirstRun) return 'Guidance'

  const hasCharacterActor =
    params.sourceNpcId != null ||
    params.tags.some((tag) => ['npc', 'personal', 'authored', 'relationship', 'character'].includes(tag))
  if (hasCharacterActor) return 'A Scene'

  const isHousehold =
    params.firingMode === 'system' ||
    params.tags.some((tag) =>
      ['household', 'ward', 'pairing', 'bond-service', 'heir', 'captivity'].includes(tag),
    )
  if (isHousehold) return 'The Household'

  const isWorldReport = params.tags.some((tag) =>
    ['world', 'economy', 'rivals', 'milestone', 'social', 'faction', 'political', 'warning'].includes(tag),
  )
  if (isWorldReport) return 'Word from the City'

  return 'Word from the City'
}

function buildEventPresentation(
  game: RootState['game'],
  eventId: string,
): EventPresentation | null {
  const template = contentCatalog.eventsById.get(eventId)
  if (!template) return null
  const instance =
    game.eventInstances.find((entry) => entry.eventId === eventId && entry.resolvedOnDay === null) ?? null
  const sourceNpcId = instance?.sourceNpcId ?? template.sourceNpcId
  const sourceDistrictId = instance?.sourceDistrictId ?? template.sourceDistrictId
  const actorName = sourceNpcId ? (contentCatalog.npcsById.get(sourceNpcId)?.name ?? null) : null
  const districtName = sourceDistrictId
    ? (contentCatalog.districtsById.get(sourceDistrictId)?.name ?? null)
    : null

  return {
    eventId: template.id,
    choiceId: template.choices[0]?.id ?? null,
    title: template.title,
    kicker: classifyEventKicker({
      isFirstRun: template.triggerConditions.isFirstRun === true,
      sourceNpcId,
      tags: template.tags,
      firingMode: template.firingMode,
    }),
    bodyText: instance?.presentationText ?? template.description,
    sceneText: template.presentationFlavour,
    sourceNpcId,
    actorName,
    actorPortraitSrc: actorName && sourceNpcId ? `/portraits/${sourceNpcId.replace('npc-', '')}.jpg` : null,
    districtId: sourceDistrictId,
    districtName,
    choices: template.choices,
  }
}

function isInformationalPresentation(presentation: EventPresentation | null): presentation is EventPresentation {
  if (!presentation) return false
  if (presentation.choices.length !== 1) return false
  return presentation.kicker === 'Word from the City' || presentation.kicker === 'The Household'
}

export type MorningReportSection = 'Your house' | 'Your contracts' | 'The city'

export type MorningReportItem = EventPresentation & {
  section: MorningReportSection
  route: string
  routeLabel: string
}

function classifyMorningReportSection(presentation: EventPresentation): MorningReportSection {
  const mentionsContractWork = presentation.choices.some((choice) =>
    choice.outcomes.some((outcome) => outcome.type === 'createQuestLead' || outcome.type === 'updateQuestStage'),
  )
  if (mentionsContractWork) return 'Your contracts'
  if (presentation.kicker === 'The Household') return 'Your house'
  return 'The city'
}

export const selectMorningReportItems = createSelector([selectGame], (game): MorningReportItem[] =>
  selectPendingEvents({ game } as RootState)
    .map((pending) => buildEventPresentation(game, pending.eventId))
    .filter(isInformationalPresentation)
    .map((presentation) => {
      const section = classifyMorningReportSection(presentation)

      return {
        ...presentation,
        section,
        route:
          section === 'Your contracts'
            ? '/contracts'
            : section === 'Your house'
              ? '/house'
              : presentation.districtId
                ? `/district/${presentation.districtId}`
                : '/district-map',
        routeLabel:
          section === 'Your contracts'
            ? 'Open Work Board'
            : section === 'Your house'
              ? 'Open House'
              : presentation.districtName
                ? `Go to ${presentation.districtName}`
                : 'Open City Map',
      }
    }),
)

export const selectEventPresentation = createSelector([selectGame], (game): EventPresentation | null => {
  const pending = selectPendingEvents({ game } as RootState)
    .map((event) => buildEventPresentation(game, event.eventId))
    .find((presentation) => presentation && !isInformationalPresentation(presentation))

  if (!pending) return null
  return pending
})

export const selectLastResolvedEventSummary = (state: RootState) =>
  state.game.lastResolvedEventSummary
