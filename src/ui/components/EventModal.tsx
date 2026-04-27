import { useDispatch, useSelector } from 'react-redux'
import { contentCatalog } from '../../application/content/contentCatalog'
import { gameActions, selectPendingEvents } from '../../application'

export function EventModal() {
  const dispatch = useDispatch()
  const pendingEvents = useSelector(selectPendingEvents)

  if (pendingEvents.length === 0) return null

  const first = pendingEvents[0]
  const template = contentCatalog.eventsById.get(first.eventId)
  if (!template) return null

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <h2 className="event-modal-title">{template.title}</h2>
        <p className="event-modal-description">{template.description}</p>
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
