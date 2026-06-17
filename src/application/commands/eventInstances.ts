import type { EventInstance, EventTemplate, PendingEvent } from '../../domain/events/contracts'
import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'

function nextEventInstanceId(state: GameState, eventId: string, prefix = 'event') {
  const count = state.eventInstances.filter((instance) => instance.eventId === eventId).length + 1
  return `${prefix}-${eventId}-${state.day}-${count}`
}

export function createEventInstance(
  state: GameState,
  template: EventTemplate,
  overrides: Partial<EventInstance> = {},
): EventInstance {
  return {
    instanceId: overrides.instanceId ?? nextEventInstanceId(state, template.id),
    eventId: template.id,
    firedOnDay: overrides.firedOnDay ?? state.day,
    resolvedOnDay: overrides.resolvedOnDay ?? null,
    chosenOptionId: overrides.chosenOptionId ?? null,
    sourceDistrictId: overrides.sourceDistrictId ?? template.sourceDistrictId ?? null,
    sourceNpcId: overrides.sourceNpcId ?? template.sourceNpcId ?? null,
    presentationText: overrides.presentationText ?? null,
    contextId: overrides.contextId ?? null,
    expiresOnDay: overrides.expiresOnDay ?? null,
  }
}

export function createPendingEvent(instance: EventInstance): PendingEvent {
  return {
    eventId: instance.eventId,
    firedOnDay: instance.firedOnDay,
    instanceId: instance.instanceId,
  }
}

export function normalizePendingEventInstances(state: GameState): GameState {
  if (state.pendingEvents.every((event) => event.instanceId)) return state

  const nextInstances = [...state.eventInstances]
  const claimedInstanceIds = new Set(
    state.pendingEvents
      .map((event) => event.instanceId)
      .filter((instanceId): instanceId is string => Boolean(instanceId)),
  )

  const nextPendingEvents = state.pendingEvents.map((pending, index) => {
    if (pending.instanceId) return pending

    const existing = nextInstances.find(
      (instance) =>
        instance.eventId === pending.eventId &&
        instance.resolvedOnDay === null &&
        !claimedInstanceIds.has(instance.instanceId),
    )

    if (existing) {
      claimedInstanceIds.add(existing.instanceId)
      return { ...pending, instanceId: existing.instanceId }
    }

    const template = contentCatalog.eventsById.get(pending.eventId)
    if (!template) return pending

    const created = createEventInstance(
      { ...state, eventInstances: nextInstances },
      template,
      {
        instanceId: `legacy-${pending.eventId}-${pending.firedOnDay}-${index + 1}`,
        firedOnDay: pending.firedOnDay,
      },
    )
    nextInstances.push(created)
    claimedInstanceIds.add(created.instanceId)
    return { ...pending, instanceId: created.instanceId }
  })

  return {
    ...state,
    pendingEvents: nextPendingEvents,
    eventInstances: nextInstances,
  }
}

export function enqueueEventInstance(
  state: GameState,
  template: EventTemplate,
  overrides: Partial<EventInstance> = {},
): GameState {
  const normalized = normalizePendingEventInstances(state)
  const instance = createEventInstance(normalized, template, overrides)

  return {
    ...normalized,
    pendingEvents: [...normalized.pendingEvents, createPendingEvent(instance)],
    eventInstances: [...normalized.eventInstances, instance],
    lastFiredDay: { ...normalized.lastFiredDay, [template.id]: instance.firedOnDay },
  }
}
