import { useAppDispatch, useAppSelector } from '../app/hooks'
import { gameActions, selectEventPresentation, selectLastResolvedEventSummary, selectPendingEvents } from '../../application'

export function EventModal() {
  const dispatch = useAppDispatch()
  const pendingEvents = useAppSelector(selectPendingEvents)
  const lastResolvedEventSummary = useAppSelector(selectLastResolvedEventSummary)
  const presentation = useAppSelector(selectEventPresentation)

  if (pendingEvents.length === 0 && !lastResolvedEventSummary) return null

  if (lastResolvedEventSummary) {
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
          {pendingEvents.length > 0 && (
            <p className="event-modal-queue">
              +{pendingEvents.length} more event{pendingEvents.length > 1 ? 's' : ''} pending
            </p>
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

  if (!presentation) return null

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <p className="event-modal-kicker">{presentation.kicker}</p>
        {(presentation.actorName || presentation.districtName) && (
          <div className="event-modal-chip-row">
            {presentation.actorName && (
              <div className="event-modal-actor-chip">
                {presentation.actorPortraitSrc && (
                  <img
                    src={presentation.actorPortraitSrc}
                    alt={`${presentation.actorName} portrait`}
                    className="event-modal-actor-portrait"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <span>{presentation.actorName}</span>
              </div>
            )}
            {presentation.districtName && (
              <span className="event-modal-district-tag">{presentation.districtName}</span>
            )}
          </div>
        )}
        <h2 className="event-modal-title">{presentation.title}</h2>
        {presentation.sceneText && (
          <p className="event-modal-scene">{presentation.sceneText}</p>
        )}
        <p className="event-modal-description">{presentation.bodyText}</p>
        <div className="event-modal-choices">
          {presentation.choices.map((choice) => (
            <button
              key={choice.id}
              className="event-modal-choice-btn"
              onClick={() =>
                dispatch(
                  gameActions.resolveEvent({
                    instanceId: presentation.instanceId,
                    eventId: presentation.eventId,
                    choiceId: choice.id,
                  }),
                )
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
