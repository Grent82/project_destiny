import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  selectCorridorStatusDisplay,
  selectCorridorClearanceProgress,
  selectActiveExpeditions,
  selectExpeditionHistory,
  type ActiveExpeditionItem,
} from '../../application/selectors/corridor'
import { useAppSelector } from '../app/hooks'

/**
 * CorridorScreen — Displays corridor status, active expeditions, and expedition history.
 *
 * Provides the player with:
 * - Current corridor status (blocked/disrupted/open) with progress bar
 * - List of active expeditions with member count, progress, and estimated return
 * - Collapsible expedition history
 * - Actions to start new expeditions or support coalitions (placeholder for now)
 */
export function CorridorScreen() {
  const navigate = useNavigate()
  const status = useAppSelector(selectCorridorStatusDisplay)
  const progress = useAppSelector(selectCorridorClearanceProgress)
  const activeExpeditions = useAppSelector(selectActiveExpeditions)
  const expeditionHistory = useAppSelector(selectExpeditionHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedExpedition, setSelectedExpedition] = useState<ActiveExpeditionItem | null>(null)

  // Status display configuration
  const statusConfig = {
    blocked: {
      label: 'Blocked',
      color: '#8B0000',
      description: 'The Green Corridor is completely blocked. Supplies cannot reach the city.',
    },
    disrupted: {
      label: 'Disrupted',
      color: '#FF8C00',
      description: 'The Green Corridor is partially blocked. Supply flow is severely restricted.',
    },
    open: {
      label: 'Open',
      color: '#228B22',
      description: 'The Green Corridor is clear. Supplies flow freely to the city.',
    },
  }

  const currentStatus = statusConfig[status]

  return (
    <section className="screen-panel">
      <p className="eyebrow">Living World</p>
      <h1>Green Corridor</h1>
      <p className="summary">
        The vital supply route through the Wilderlands to Valdenmoor
      </p>

      {/* Corridor Status Panel */}
      <article className="corridor-status-panel">
        <h2>Corridor Status</h2>
        <div
          className="status-indicator"
          style={{
            backgroundColor: currentStatus.color,
            color: status === 'open' ? '#fff' : '#000',
          }}
        >
          {currentStatus.label}
        </div>
        <p className="status-description">{currentStatus.description}</p>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-label">
            <span>Clearance Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress}%`,
                backgroundColor: status === 'open' ? '#228B22' : '#4169E1',
              }}
            />
          </div>
          {status === 'open' && (
            <p className="progress-message">The corridor has been cleared and is operational.</p>
          )}
        </div>
      </article>

      {/* Action Buttons */}
      <div className="corridor-actions">
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={() => {
            // TODO: Open expedition formation modal
            navigate('/expedition')
          }}
          disabled={status === 'open'}
        >
          Start Expedition
        </button>
        <button
          className="action-button"
          type="button"
          onClick={() => {
            // TODO: Open support/donation modal
            // For now, navigate to ledger for resource management
            navigate('/ledger')
          }}
        >
          Support Coalition
        </button>
      </div>

      {/* Active Expeditions */}
      <article className="active-expeditions-panel">
        <h2>Active Expeditions</h2>
        {activeExpeditions.length === 0 ? (
          <p className="empty-state">
            No active expeditions. Form a coalition to begin clearing the corridor.
          </p>
        ) : (
          <ul className="expedition-list">
            {activeExpeditions.map((expedition) => (
              <li
                key={expedition.id}
                className={`expedition-item ${selectedExpedition?.id === expedition.id ? 'selected' : ''}`}
                onClick={() =>
                  setSelectedExpedition(
                    selectedExpedition?.id === expedition.id ? null : expedition,
                  )
                }
              >
                <div className="expedition-header">
                  <span className="expedition-status">{expedition.status}</span>
                  <span className="expedition-progress">{expedition.progress}%</span>
                </div>
                <div className="expedition-details">
                  <p className="expedition-leader">Leader: {expedition.leaderName}</p>
                  <p className="expedition-members">{expedition.memberCount} members</p>
                  <p className="expedition-return">
                    Est. return: Day {expedition.estimatedReturnDay}
                  </p>
                  <p className="expedition-difficulty">Difficulty: {expedition.difficulty}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Expedition History Toggle */}
      <article className="expedition-history-panel">
        <button
          className="toggle-button"
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          aria-expanded={showHistory}
        >
          {showHistory ? '▼' : '▶'} Expedition History
        </button>
        {showHistory && (
          <div className="history-content">
            {expeditionHistory.length === 0 ? (
              <p className="empty-state">No expedition history yet.</p>
            ) : (
              <ul className="history-list">
                {expeditionHistory.map((item) => (
                  <li key={item.id} className="history-item">
                    <span className="history-status">{item.status}</span>
                    <span className="history-progress">{item.finalProgress}% complete</span>
                    <span className="history-meta">
                      Formed day {item.formedDay} • Difficulty {item.difficulty} •{' '}
                      {item.memberCount} members
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>

      {/* Back to Dashboard */}
      <button
        className="action-button"
        type="button"
        onClick={() => navigate('/dashboard')}
        style={{ marginTop: '1rem' }}
      >
        ← Back to Dashboard
      </button>
    </section>
  )
}
