import { useState } from 'react'

import {
  hasSavedSession,
  loadSavedSession,
  type SaveGameStore,
  saveCurrentSession,
  selectDashboardSummary,
} from '../../application'
import { createBrowserSaveSnapshotStore } from '../../infrastructure/persistence/localSaveSnapshot'
import { useAppSelector, useAppStore } from '../app/hooks'

interface DashboardScreenProps {
  saveStore?: SaveGameStore
}

export function DashboardScreen(props: DashboardScreenProps) {
  const { saveStore = createBrowserSaveSnapshotStore() } = props
  const store = useAppStore()
  const summary = useAppSelector(selectDashboardSummary)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [canLoadSavedSession, setCanLoadSavedSession] = useState(() =>
    hasSavedSession(saveStore),
  )

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Dashboard</h1>
      <p className="summary">
        Application state is now flowing through the store boundary rather than
        raw seed files in the UI.
      </p>
      <div className="session-actions">
        <button
          className="action-button"
          onClick={() => {
            saveCurrentSession(store, saveStore)
            setCanLoadSavedSession(true)
            setSessionMessage('Session saved to local snapshot.')
          }}
          type="button"
        >
          Save session
        </button>
        <button
          className="action-button"
          disabled={!canLoadSavedSession}
          onClick={() => {
            const didLoad = loadSavedSession(store, saveStore)
            setSessionMessage(
              didLoad
                ? 'Session restored from local snapshot.'
                : 'No saved session available.',
            )
          }}
          type="button"
        >
          Load session
        </button>
      </div>
      <p className="summary">Loading replaces the current in-memory session.</p>
      {sessionMessage ? <p className="purchase-feedback">{sessionMessage}</p> : null}
      <div className="stats-grid">
        <article>
          <h2>Cycle</h2>
          <p>
            Day {summary.day}, {summary.timeSlot}
          </p>
        </article>
        <article>
          <h2>Funds</h2>
          <p>{summary.money} credits</p>
        </article>
        <article>
          <h2>Roster</h2>
          <p>{summary.rosterCount} operatives tracked</p>
        </article>
        <article>
          <h2>Squad</h2>
          <p>{summary.assignedSquadCount} assigned</p>
        </article>
      </div>
      <article className="detail-panel dashboard-activity-panel">
        <h2>Recent Activity</h2>
        <div className="combat-log-list">
          {summary.recentActivity.length > 0 ? (
            summary.recentActivity.map((entry) => (
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
            <p className="summary">No recent activity has been recorded yet.</p>
          )}
        </div>
      </article>
    </section>
  )
}
