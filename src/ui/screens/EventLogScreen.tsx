import { selectEventLogEntries } from '../../application'
import { useAppSelector } from '../app/hooks'

export function EventLogScreen() {
  const summary = useAppSelector(selectEventLogEntries)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Event Log</h1>
      <p className="summary">
        Review the latest systemic changes across economy and combat.
      </p>

      <div className="overview-grid">
        <article>
          <h2>Activity Feed</h2>
          <div className="combat-log-list">
            {summary.activityLog.length > 0 ? (
              summary.activityLog.map((entry) => (
                <div key={entry.id} className="combat-log-entry">
                  <strong>
                    Day {entry.day} · {entry.timeSlot}
                  </strong>
                  <div className="badge-row">
                    <span className="badge">{entry.category}</span>
                  </div>
                  <p>{entry.message}</p>
                </div>
              ))
            ) : (
              <p className="summary">No major events have been recorded yet.</p>
            )}
          </div>
        </article>

        <article>
          <h2>Combat Recap</h2>
          {summary.activeCombatOutcome ? (
            <>
              <p>
                Current encounter state: <span className="badge">{summary.activeCombatOutcome}</span>
              </p>
              <div className="combat-log-list">
                {summary.recentCombatEntries.map((entry) => (
                  <div
                    key={`${entry.round}-${entry.actorId}-${entry.summary}`}
                    className="combat-log-entry"
                  >
                    <strong>Round {entry.round}</strong>
                    <p>{entry.summary}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="summary">
              No combat recap is available until an encounter has been started.
            </p>
          )}
        </article>
      </div>
    </section>
  )
}
