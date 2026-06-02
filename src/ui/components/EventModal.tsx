import { useAppDispatch, useAppSelector } from '../app/hooks'
import { contentCatalog } from '../../application/content/contentCatalog'
import { gameActions, selectLastResolvedEventSummary, selectPendingEvents } from '../../application'

export function EventModal() {
  const dispatch = useAppDispatch()
  const pendingEvents = useAppSelector(selectPendingEvents)
  const lastResolvedEventSummary = useAppSelector(selectLastResolvedEventSummary)
  const firstEventId = pendingEvents[0]?.eventId ?? null
  const instance = useAppSelector((state) =>
    firstEventId
      ? state.game.eventInstances.find(
          (entry) => entry.eventId === firstEventId && entry.resolvedOnDay === null,
        ) ?? null
      : null,
  )

  if (pendingEvents.length === 0 && !lastResolvedEventSummary) return null

  if (pendingEvents.length === 0 && lastResolvedEventSummary) {
    const sections = [
      { title: 'Player Impact', lines: lastResolvedEventSummary.playerEffects },
      { title: 'NPC Impact', lines: lastResolvedEventSummary.npcEffects },
      { title: 'World Impact', lines: lastResolvedEventSummary.worldEffects },
    ].filter((section) => section.lines.length > 0)

    return (
      <div className="event-modal-overlay">
        <div className="event-modal">
          <p className="event-modal-kicker">Event Outcome</p>
          <h2 className="event-modal-title">{lastResolvedEventSummary.title}</h2>
          <p className="event-modal-description">
            You chose: {lastResolvedEventSummary.choiceLabel}
          </p>
          {lastResolvedEventSummary.sourceNpcName && (
            <p className="event-modal-meta">Scene anchored by {lastResolvedEventSummary.sourceNpcName}.</p>
          )}
          {lastResolvedEventSummary.narrativeOutcome && (
            <p className="event-modal-description">{lastResolvedEventSummary.narrativeOutcome}</p>
          )}
          {sections.length > 0 && (
            <div className="event-modal-impact-list">
              {sections.map((section) => (
                <section key={section.title} className="event-modal-impact-section">
                  <h3>{section.title}</h3>
                  <ul>
                    {section.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <div className="event-modal-choices">
            <button
              className="event-modal-choice-btn"
              onClick={() => dispatch(gameActions.dismissResolvedEventSummary())}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

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
