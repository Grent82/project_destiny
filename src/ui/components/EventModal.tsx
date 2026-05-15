import { useAppDispatch, useAppSelector } from '../app/hooks'
import { contentCatalog } from '../../application/content/contentCatalog'
import { gameActions, selectPendingEvents } from '../../application'

export function EventModal() {
  const dispatch = useAppDispatch()
  const pendingEvents = useAppSelector(selectPendingEvents)
  const firstEventId = pendingEvents[0]?.eventId ?? null
  const instance = useAppSelector((state) =>
    firstEventId
      ? state.game.eventInstances.find(
          (entry) => entry.eventId === firstEventId && entry.resolvedOnDay === null,
        ) ?? null
      : null,
  )

  if (pendingEvents.length === 0) return null

  const first = pendingEvents[0]
  const template = contentCatalog.eventsById.get(first.eventId)
  if (!template) return null

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <h2 className="event-modal-title">{template.title}</h2>
        <p className="event-modal-description">{instance?.presentationText ?? template.description}</p>
        <div className="event-modal-choices">
          {template.choices.map((choice) => (
            <button
              key={choice.id}
              className="event-modal-choice-btn"
              onClick={() =>
                dispatch(gameActions.resolveEvent({ eventId: first.eventId, choiceId: choice.id }))
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
        {pendingEvents.length > 1 && (
          <p className="event-modal-queue">
            +{pendingEvents.length - 1} more event{pendingEvents.length - 1 > 1 ? 's' : ''} pending
          </p>
        )}
      </div>
    </div>
  )
}
