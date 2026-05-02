import { useState } from 'react'

import {
  gameActions,
  hasSavedSession,
  loadSavedSession,
  type SaveGameStore,
  saveCurrentSession,
  selectDashboardSummary,
  selectDebtStatus,
  selectMainQuest,
  selectPlayerCharacter,
  selectProtagonistName,
} from '../../application'
import { createBrowserSaveSnapshotStore } from '../../infrastructure/persistence/localSaveSnapshot'
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks'
import { ResourceStatusPanel } from '../components/ResourceStatusPanel'

const CITY_DIAL_TOOLTIPS: Record<string, string> = {
  control: 'Control — degree of civic order. High control reduces crime and faction conflict. Low control enables unrest and criminal activity.',
  prosperity: 'Prosperity — economic health of the city. Affects market prices, NPC wages, and district development.',
  unrest: 'Unrest — public discontent and social instability. High unrest increases district danger and faction aggression.',
  corruption: 'Corruption — institutional decay and bribery. Affects enforcement, faction standing thresholds, and civic services.',
}

const DASHBOARD_TABS = ['Overview', 'Operations', 'Intelligence'] as const
type DashboardTab = (typeof DASHBOARD_TABS)[number]

interface DashboardScreenProps {
  saveStore?: SaveGameStore
}

export function DashboardScreen(props: DashboardScreenProps) {
  const { saveStore = createBrowserSaveSnapshotStore() } = props
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const playerCharacter = useAppSelector(selectPlayerCharacter)
  const isFirstRun = useAppSelector((state) => state.game.isFirstRun)
  const debt = useAppSelector(selectDebtStatus)
  const mainQuest = useAppSelector(selectMainQuest)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [canLoadSavedSession, setCanLoadSavedSession] = useState(() =>
    hasSavedSession(saveStore),
  )
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview')

  const displayName = playerCharacter.name || protagonistName || 'Valdric'

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Lord {displayName}, House Valdris</h1>

      {/* Critical info — always visible */}
      <div className="day-header">
        <p className="day-display">
          Day {summary.day} —{' '}
          {summary.timeSlot.charAt(0).toUpperCase() + summary.timeSlot.slice(1)}
        </p>
        <button
          className="action-button action-button--primary"
          onClick={() => dispatch(gameActions.advanceTimeSlot())}
          type="button"
        >
          {summary.timeSlot === 'night' ? 'End Night →' : `End ${summary.timeSlot.charAt(0).toUpperCase() + summary.timeSlot.slice(1)} →`}
        </button>
      </div>
      <div className="dashboard-critical-strip">
        <span className="badge">{summary.money} Mk</span>
        {!debt.debtPaid && !debt.debtCrisisTriggered && (
          <span className="badge badge-warning">Debt: {debt.debtAmount} Mk · {debt.daysRemaining}d left</span>
        )}
        {debt.debtCrisisTriggered && (
          <span className="badge badge-warning">DEBT DEFAULTED</span>
        )}
        {debt.debtPaid && (
          <span className="badge badge-positive">Debt settled ✓</span>
        )}
      </div>

      {/* Tab navigation */}
      <div className="npc-tab-bar dashboard-tab-bar" role="tablist">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'npc-tab npc-tab-active' : 'npc-tab'}
            role="tab"
            aria-selected={tab === activeTab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Zone 1: Overview — debt, quest, personnel */}
      {activeTab === 'Overview' && (
        <>
          <p className="summary">
            The debt claim against House Valdric is active. Marion is waiting. The ledgers are in
            worse shape than they look.
          </p>
          {isFirstRun && (
            <div className="first-run-directive">
              <p>House Valdris has debts and work available.</p>
              <a href="/contracts" className="directive-link">→ Check the Work Board</a>
            </div>
          )}
          <article className={`detail-panel debt-claim-panel${debt.debtCrisisTriggered ? ' debt-claim-panel--crisis' : debt.debtPaid ? ' debt-claim-panel--settled' : ''}`}>
            {debt.debtCrisisTriggered ? (
              <>
                <h2>Debt Claim — <span className="debt-status debt-status--defaulted">DEFAULTED ✗</span></h2>
                <p className="debt-crisis-message">The creditors have moved. The house is seized.</p>
              </>
            ) : debt.debtPaid ? (
              <>
                <h2>Debt Claim — <span className="debt-status debt-status--settled">Settled ✓</span></h2>
                <p>House Valdris stands clear. The creditors withdrew.</p>
              </>
            ) : (
              <>
                <h2>Debt Claim — <span className="debt-status debt-status--active">Active</span></h2>
                <p>
                  {debt.debtAmount} Marks owed · Due: Day {debt.debtDueDay} · {debt.daysRemaining} day{debt.daysRemaining !== 1 ? 's' : ''} remaining
                </p>
                <button
                  className="action-button action-button--secondary"
                  disabled={debt.marks === 0 || debt.debtAmount === 0}
                  onClick={() =>
                    dispatch(gameActions.payDebt({ amount: Math.min(debt.marks, debt.debtAmount) }))
                  }
                  type="button"
                >
                  Pay {Math.min(debt.marks, debt.debtAmount)} Marks
                </button>
              </>
            )}
          </article>
          <article className="detail-panel mira-quest-panel">
            <h2>The Search for Mira</h2>
            <p className="summary">
              {mainQuest.stage === 'searching' && (
                <em>Mira has been missing for three months. No word. No body. You hold onto that.</em>
              )}
              {mainQuest.stage === 'lead-found' && (
                <em>{mainQuest.lastClue || 'A lead has surfaced. Something to follow.'}</em>
              )}
              {mainQuest.stage === 'location-known' && (
                <em>{mainQuest.lastClue || 'Her location is known. Getting to her is another matter.'}</em>
              )}
              {mainQuest.stage === 'rescued' && (
                <em>Mira is safe. For now. She carries something — a knowledge she hasn't shared.</em>
              )}
              {mainQuest.stage === 'epilogue' && (
                <em>{mainQuest.lastClue || 'What Mira knows changes everything. The search is over. Something larger has begun.'}</em>
              )}
            </p>
            {(mainQuest.stage === 'lead-found' || mainQuest.stage === 'location-known') && (
              <span className={`badge ${mainQuest.stage === 'location-known' ? 'badge-warning' : ''}`}>
                {mainQuest.stage === 'lead-found' ? 'Lead in hand' : 'Location known'}
              </span>
            )}
            {mainQuest.stage === 'rescued' && (
              <span className="badge badge-positive">Mira recovered</span>
            )}
            {mainQuest.stage === 'epilogue' && (
              <span className="badge badge-warning">◆ New chapter</span>
            )}
          </article>
          <div className="stats-grid">
            <article>
              <h2>Personnel</h2>
              <p>{summary.rosterCount} in house service</p>
            </article>
            <article>
              <h2>Deployed</h2>
              <p>{summary.assignedSquadCount} in the field</p>
            </article>
            <article>
              <h2>House Location</h2>
              <p>House Valdris — The Pale</p>
            </article>
          </div>
        </>
      )}

      {/* Zone 2: Operations — resources, session management */}
      {activeTab === 'Operations' && (
        <>
          <ResourceStatusPanel />
          <div className="session-actions">
            <button
              className="action-button action-button--secondary"
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
              className="action-button action-button--secondary"
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
        </>
      )}

      {/* Zone 3: Intelligence — city dials, activity log */}
      {activeTab === 'Intelligence' && (
        <>
          <article className="detail-panel">
            <h2>City Dials</h2>
            {(['control', 'prosperity', 'unrest', 'corruption'] as const).map((dial) => (
              <div key={dial} className="stat-row">
                <span className="stat-label" style={{ textTransform: 'capitalize' }} title={CITY_DIAL_TOOLTIPS[dial]}>
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
            <h2>The Log</h2>
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
                <p className="summary">Nothing has been logged yet. The ledger is empty.</p>
              )}
            </div>
          </article>
        </>
      )}
    </section>
  )
}

