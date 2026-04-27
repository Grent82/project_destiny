import { useState } from 'react'

import {
  gameActions,
  hasSavedSession,
  loadSavedSession,
  type SaveGameStore,
  saveCurrentSession,
  selectDashboardSummary,
  selectProtagonistName,
} from '../../application'
import { createBrowserSaveSnapshotStore } from '../../infrastructure/persistence/localSaveSnapshot'
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks'
import { ResourceStatusPanel } from '../components/ResourceStatusPanel'

interface DashboardScreenProps {
  saveStore?: SaveGameStore
}

export function DashboardScreen(props: DashboardScreenProps) {
  const { saveStore = createBrowserSaveSnapshotStore() } = props
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [canLoadSavedSession, setCanLoadSavedSession] = useState(() =>
    hasSavedSession(saveStore),
  )

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Dashboard — {protagonistName}</h1>
      <div className="day-header">
        <p className="day-display">
          Day {summary.day} —{' '}
          {summary.timeSlot.charAt(0).toUpperCase() + summary.timeSlot.slice(1)}
        </p>
        <button
          className="action-button action-button--primary"
          onClick={() => dispatch(gameActions.endDay())}
          type="button"
        >
          End Day →
        </button>
      </div>
      <p className="summary">
        The debt claim against House Valdric is active. Marion is waiting. The ledgers are in
        worse shape than they look.
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
          <p>{summary.money} Marks</p>
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
      <ResourceStatusPanel />
      <article className="detail-panel">
        <h2>City Dials</h2>
        {(['control', 'prosperity', 'unrest', 'corruption'] as const).map((dial) => (
          <div key={dial} className="stat-row">
            <span className="stat-label" style={{ textTransform: 'capitalize' }}>
              {dial}
            </span>
            <span className="stat-value">{summary.cityDials[dial]}</span>
            <div className="stat-bar">
              <div
                className="stat-bar-fill"
                style={{ width: `${summary.cityDials[dial]}%` }}
              />
            </div>
          </div>
        ))}
      </article>
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
