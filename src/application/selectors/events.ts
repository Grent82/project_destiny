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
  title: string
  kicker: string
  bodyText: string
  sceneText: string | null
  actorName: string | null
  actorPortraitSrc: string | null
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

export const selectEventPresentation = createSelector([selectGame], (game): EventPresentation | null => {
  const pending = game.pendingEvents.find((event) => event.firedOnDay <= game.day)
  if (!pending) return null

  const template = contentCatalog.eventsById.get(pending.eventId)
  if (!template) return null

  const instance =
    game.eventInstances.find(
      (entry) => entry.eventId === pending.eventId && entry.resolvedOnDay === null,
    ) ?? null

  const sourceNpcId = instance?.sourceNpcId ?? template.sourceNpcId
  const sourceDistrictId = instance?.sourceDistrictId ?? template.sourceDistrictId
  const actorName = sourceNpcId ? (contentCatalog.npcsById.get(sourceNpcId)?.name ?? null) : null
  const districtName = sourceDistrictId
    ? (contentCatalog.districtsById.get(sourceDistrictId)?.name ?? null)
    : null

  return {
    eventId: template.id,
    title: template.title,
    kicker: classifyEventKicker({
      isFirstRun: template.triggerConditions.isFirstRun === true,
      sourceNpcId,
      tags: template.tags,
      firingMode: template.firingMode,
    }),
    bodyText: instance?.presentationText ?? template.description,
    sceneText: template.presentationFlavour,
    actorName,
    actorPortraitSrc: actorName && sourceNpcId ? `/portraits/${sourceNpcId.replace('npc-', '')}.jpg` : null,
    districtName,
    choices: template.choices,
  }
})

export const selectLastResolvedEventSummary = (state: RootState) =>
  state.game.lastResolvedEventSummary
