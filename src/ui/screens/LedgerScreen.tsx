import { gameActions, selectFactionSummaries, selectLedgerSummary, selectDailyIncomeBreakdown } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { formatMarks, formatMarksPerDay } from '../../domain/game/currency'
import { EmptyState } from '../components/EmptyState'
import { runwayBarClass, runwayBarPercent } from './runwayIndicator'

const QUEST_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
}

function formatQuestStageLabel(stageId: string): string {
  return stageId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function standingLabel(standing: number): string {
  if (standing >= 60) return 'Allied'
  if (standing >= 30) return 'Friendly'
  if (standing >= 10) return 'Warm'
  if (standing >= -10) return 'Neutral'
  if (standing >= -30) return 'Cool'
  if (standing >= -60) return 'Cold'
  return 'Hostile'
}

function standingClass(standing: number): string {
  if (standing >= 30) return 'ledger-standing--positive'
  if (standing >= -30) return 'ledger-standing--neutral'
  return 'ledger-standing--negative'
}


export function LedgerScreen() {
  const ledger = useAppSelector(selectLedgerSummary)
  const income = useAppSelector(selectDailyIncomeBreakdown)
  const factions = useAppSelector(selectFactionSummaries)
  const dispatch = useAppDispatch()

  const debtUrgent = !ledger.debtPaid && ledger.daysRemaining <= 5
  const debtActive = !ledger.debtPaid && !ledger.debtCrisisTriggered
  const runwayIsUnbounded = ledger.daysOfRunwayAtCurrentRate >= 999
  const runwayBarPct = runwayBarPercent(ledger.daysOfRunwayAtCurrentRate, runwayIsUnbounded)
  const runwayClass = runwayIsUnbounded ? 'ledger-runway--safe' : runwayBarClass(ledger.daysOfRunwayAtCurrentRate)
  const debtShortfall = ledger.debtAmount - ledger.projectedMarksByDebt

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Accounts</p>
      <h1>The Ledger</h1>
      <p className="summary">
        The founding legal record of House Valdris — kept in the manor. Every contract signed,
        every wage promised, every debt owed. Whoever holds the Ledger holds the house.
      </p>

      {/* Debt block */}
      <div className={`ledger-debt-block ${debtUrgent ? 'ledger-debt-block--urgent' : ''}`}>
        <div className="ledger-debt-block__header">
          <h2>Outstanding Debt Claim</h2>
          {!ledger.debtPaid && !ledger.debtCrisisTriggered && (
            <span className="ledger-debt-block__days">
              {ledger.daysRemaining} day{ledger.daysRemaining !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>

        {ledger.debtCrisisTriggered ? (
          <p className="ledger-debt-block__seized">
            The claim has been enforced. The house has been seized.
          </p>
        ) : ledger.debtPaid ? (
          <p className="ledger-debt-block__cleared">Debt cleared. House Valdris stands free.</p>
        ) : (
          <div className="ledger-debt-block__body">
            <p>
              Claimant: <strong>{ledger.debtClaimantName}</strong>
            </p>
            <p>
              Enforced by: <strong>{ledger.debtEnforcementName}</strong>
            </p>
            <p>
              Beneficiary: <strong>{ledger.debtBeneficiaryName}</strong>
            </p>
            <p>
              <strong>{formatMarks(ledger.debtAmount)}</strong> owed. Due on day {ledger.debtDueDay}.
            </p>
            <p className="ledger-debt-block__balance">
              Current marks: <strong>{formatMarks(ledger.marks)}</strong>
              {ledger.marks < ledger.debtAmount && (
                <span className="text-danger">
                  {' '}
                  — short {formatMarks(ledger.debtAmount - ledger.marks)}
                </span>
              )}
            </p>
            <button
              className="action-button action-button--primary"
              disabled={ledger.marks < ledger.debtAmount} title={ledger.marks < ledger.debtAmount ? `Not enough Marks. You need ${formatMarks(ledger.debtAmount - ledger.marks)} more to pay the debt.` : undefined}
              onClick={() => dispatch(gameActions.payDebt({ amount: ledger.debtAmount }))}
              type="button"
            >
              Pay Debt — {formatMarks(ledger.debtAmount)}
            </button>
          </div>
        )}
      </div>

      {(ledger.dailyExpenses > 0 || debtActive) && (
        <div className="ledger-runway-block">
          {debtActive && !ledger.willMeetDebt && (
            <div className="ledger-runway-alert" role="alert">
              ⚠ CRITICAL: Cannot meet debt obligation — short {formatMarks(debtShortfall)}
            </div>
          )}
          {ledger.dailyExpenses > 0 && (
            <div className="ledger-runway-row">
              <span className="ledger-runway-label" title="Days until marks run out at current net daily burn rate">
                Runway
              </span>
              <div className="ledger-runway-bar">
                <div className={`ledger-runway-bar__fill ${runwayClass}`} style={{ width: `${runwayBarPct}%` }} />
              </div>
              <span className="ledger-runway-days">
                {runwayIsUnbounded ? 'No burn' : `${ledger.daysOfRunwayAtCurrentRate} days`}
              </span>
            </div>
          )}
          {debtActive && (
            <p className="ledger-runway-deadline">
              Debt due: Day {ledger.debtDueDay} ({ledger.daysRemaining} day{ledger.daysRemaining !== 1 ? 's' : ''}{' '}
              remaining)
              {!ledger.willMeetDebt && (
                <span className="ledger-runway-shortfall"> — Shortfall: {formatMarks(debtShortfall)} needed</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Daily P&L */}
      <div className="ledger-section">
        <h2>Daily Accounts</h2>
        <table className="ledger-table">
          <tbody>
            <tr>
              <td>Working income</td>
              <td className="ledger-table__value text-success">+{formatMarksPerDay(income.workingNpcIncome)}</td>
            </tr>
            <tr>
              <td>Title income</td>
              <td className="ledger-table__value text-success">+{formatMarksPerDay(income.titleIncome)}</td>
            </tr>
            <tr>
              <td>Wages</td>
              <td className="ledger-table__value text-danger">−{formatMarksPerDay(income.wages)}</td>
            </tr>
            <tr className="ledger-table__row--total">
              <td>Net</td>
              <td className={`ledger-table__value ${income.net >= 0 ? 'text-success' : 'text-danger'}`}>
                {income.net >= 0 ? '+' : ''}{formatMarksPerDay(income.net)}
              </td>
            </tr>
            <tr className="ledger-table__row--total">
              <td>Marks on hand</td>
              <td className="ledger-table__value">{formatMarks(ledger.marks)}</td>
            </tr>
            {!ledger.debtPaid && (
              <tr>
                <td title="Projected marks after accounting for net daily income until debt due day">
                  Projected at debt day
                </td>
                <td
                  className={`ledger-table__value ${ledger.willMeetDebt ? 'text-success' : 'text-danger'}`}
                >
                  {formatMarks(ledger.projectedMarksByDebt)}{' '}
                  {ledger.willMeetDebt ? '✓ on track' : '✗ shortfall'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Faction obligations */}
      <div className="ledger-section">
        <h2>Faction Standing</h2>
        <table className="ledger-table">
          <tbody>
            {factions.map((f) => (
              <tr key={f.factionId}>
                <td>{f.name}</td>
                <td className={`ledger-table__value ${standingClass(f.standingWithPlayer)}`}>
                  {standingLabel(f.standingWithPlayer)} ({f.standingWithPlayer > 0 ? '+' : ''}
                  {f.standingWithPlayer})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contract registry */}
      <div className="ledger-section">
        <h2>Contract Registry</h2>
        {ledger.activeContracts.length === 0 ? (
          <EmptyState message="No contracts on record. The house has taken no work." icon="📜" />
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Accepted</th>
                <th>Status</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {ledger.activeContracts.map((c) => (
                <tr key={c.questId}>
                  <td>
                    <strong>{c.title}</strong>
                    {c.currentObjectiveLabel && (
                      <>
                        <br />
                        <span className="summary">{c.currentObjectiveLabel}</span>
                      </>
                    )}
                    {c.incidentDistrictName && (
                      <>
                        <br />
                        <span className="summary">District: {c.incidentDistrictName}</span>
                      </>
                    )}
                  </td>
                  <td>Day {c.acceptedOnDay}</td>
                  <td>{QUEST_STATUS_LABEL[c.status] ?? c.status}</td>
                  <td>{formatQuestStageLabel(c.stageId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
