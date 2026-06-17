import type { EventInstance, EventTemplate, PendingEvent } from '../../domain/events/contracts'
import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

export const MAX_RESOLVED_EVENT_INSTANCES = 200

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

export function enqueueTemplateEvent(
  state: GameState,
  eventId: string,
  overrides: Partial<EventInstance> = {},
): GameState {
  const template = contentCatalog.eventsById.get(eventId)
  if (!template) return state
  return enqueueEventInstance(state, template, overrides)
}

export function isEventInstanceExpired(
  state: Pick<GameState, 'day' | 'eventInstances'>,
  pendingEvent: PendingEvent,
) {
  if (!pendingEvent.instanceId) return false
  const instance = state.eventInstances.find((entry) => entry.instanceId === pendingEvent.instanceId)
  if (!instance || instance.resolvedOnDay !== null || instance.expiresOnDay == null) return false
  return instance.expiresOnDay < state.day
}

export function pruneExpiredEventInstances(state: GameState): GameState {
  const normalized = normalizePendingEventInstances(state)
  const expiredPending = normalized.pendingEvents.filter((pending) =>
    isEventInstanceExpired(normalized, pending),
  )
  if (expiredPending.length === 0) return normalized

  const expiredIds = new Set(expiredPending.map((pending) => pending.instanceId).filter(Boolean))
  let next: GameState = {
    ...normalized,
    pendingEvents: normalized.pendingEvents.filter((pending) => !expiredIds.has(pending.instanceId ?? null)),
    eventInstances: normalized.eventInstances.map((instance) =>
      expiredIds.has(instance.instanceId) ? { ...instance, resolvedOnDay: normalized.day } : instance,
    ),
  }

  for (const pending of expiredPending) {
    const template = contentCatalog.eventsById.get(pending.eventId)
    if (!template) continue
    next = appendActivityLogEntry(
      next,
      'system',
      `The moment to answer "${template.title}" has passed.`,
    )
  }

  return next
}

export function compactResolvedEventInstances(state: GameState): GameState {
  const normalized = normalizePendingEventInstances(state)
  const protectedIds = new Set(
    normalized.pendingEvents
      .map((pending) => pending.instanceId)
      .filter((instanceId): instanceId is string => Boolean(instanceId)),
  )
  const removableResolved = normalized.eventInstances
    .filter((instance) => instance.resolvedOnDay !== null && !protectedIds.has(instance.instanceId))
    .sort((left, right) => {
      const leftResolved = left.resolvedOnDay ?? Number.MAX_SAFE_INTEGER
      const rightResolved = right.resolvedOnDay ?? Number.MAX_SAFE_INTEGER
      if (leftResolved !== rightResolved) return leftResolved - rightResolved
      if (left.firedOnDay !== right.firedOnDay) return left.firedOnDay - right.firedOnDay
      return left.instanceId.localeCompare(right.instanceId)
    })

  if (removableResolved.length <= MAX_RESOLVED_EVENT_INSTANCES) return normalized

  const overflow = removableResolved.length - MAX_RESOLVED_EVENT_INSTANCES
  const trimmedIds = new Set(removableResolved.slice(0, overflow).map((instance) => instance.instanceId))
  return {
    ...normalized,
    eventInstances: normalized.eventInstances.filter((instance) => !trimmedIds.has(instance.instanceId)),
  }
}
