import { selectEventLogEntries } from '../../application'
import { useAppSelector } from '../app/hooks'

export function EventLogScreen() {
  const summary = useAppSelector(selectEventLogEntries)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>The Record</h1>
      <p className="summary">
        What has been logged. Economy shifts, encounters, the state of things as the days turn.
      </p>

      <div className="overview-grid">
        <article>
          <h2>The Log</h2>
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
              <p className="summary">Nothing recorded yet. The ledger is clean.</p>
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
              No combat recap available. The squad has not deployed yet.
            </p>
          )}
        </article>
      </div>
    </section>
  )
}
