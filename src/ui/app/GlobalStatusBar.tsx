import { gameActions, selectCurrentDistrict, selectDashboardSummary, selectDebtStatus, selectPendingEventsCount, selectPlayerCharacter, selectProtagonistName, selectRenownLevel, selectRenownProgress, selectRenownThresholds, selectReputationTier } from '../../application'
import { formatMarks, formatMarksAbbrev } from '../../domain/game/currency'
import { useAppDispatch, useAppSelector } from './hooks'

export function GlobalStatusBar() {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const playerCharacter = useAppSelector(selectPlayerCharacter)
  const currentDistrict = useAppSelector(selectCurrentDistrict)
  const reputationTier = useAppSelector(selectReputationTier)
  const pendingEventsCount = useAppSelector(selectPendingEventsCount)

  const debt = useAppSelector(selectDebtStatus)

  const displayName = playerCharacter.name || protagonistName || 'Valdris'
  const renownLevel = useAppSelector(selectRenownLevel)
  const renownProgress = useAppSelector(selectRenownProgress)
  const RENOWN_THRESHOLDS = selectRenownThresholds()
  const showEndDayTutorialHint = useAppSelector((state) => state.game.day === 2)
  const nextThreshold = RENOWN_THRESHOLDS.find((t) => t.level === renownLevel.level + 1)
  const renownTooltip = nextThreshold
    ? `Renown: ${playerCharacter.renown} · ${renownLevel.label} (Level ${renownLevel.level}) · Roster slots: ${renownLevel.rosterSlots} · Next rank at ${nextThreshold.renown} (${renownProgress.pct}%)`
    : `Renown: ${playerCharacter.renown} · ${renownLevel.label} (Level ${renownLevel.level}) · Roster slots: ${renownLevel.rosterSlots} · Maximum rank`

  return (
    <>
      <div className="global-status-bar" role="status" aria-label="Game status">
        <div className="status-zone status-zone--identity">
          <span className="status-house-name">{displayName}</span>
          <span className="status-day">
            Day <strong>{summary.day}</strong> · {summary.timeSlot}
          </span>
        </div>

        <div className="status-zone status-zone--resources">
          <span className="status-marks">
            <strong>{formatMarksAbbrev(summary.money)}</strong>
          </span>
          {!debt.debtPaid && (
            <span
              className={`status-debt${debt.daysRemaining <= 5 ? ' status-debt--urgent' : ''}`}
              title={`Debt: ${formatMarks(debt.debtAmount)} claimed by ${debt.debtClaimantName}, enforced by ${debt.debtEnforcementName}, due in ${debt.daysRemaining} days`}
            >
              Debt: <strong>{debt.daysRemaining}d</strong>
            </span>
          )}
          <span className="status-rep">{reputationTier}</span>
          <span className="status-renown" title={renownTooltip}>
            ✦ {renownLevel.label}
          </span>
          {currentDistrict && (
            <span className="status-district">⬡ {currentDistrict.name}</span>
          )}
        </div>

        <div className="status-zone status-zone--actions">
          {pendingEventsCount > 0 && (
            <span className="badge status-events-badge">● {pendingEventsCount}</span>
          )}
          {summary.deployedCount > 0 && (
            <span className="badge badge-warning">⚔ {summary.deployedCount}</span>
          )}
          <button
            className="action-button status-bar-end-day"
            onClick={() => dispatch(gameActions.endDay())}
            type="button"
          >
            End Day →
          </button>
        </div>
      </div>

      {showEndDayTutorialHint && (
        <div className="status-tutorial-hint" role="note" aria-label="End day guidance">
          <strong>The day turns here.</strong> Use <span>End Day</span> after you have planned work. It settles wages, condition shifts, city pressure, and pending world fallout in one step.
        </div>
      )}
    </>
  )
}
