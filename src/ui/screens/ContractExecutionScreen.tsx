import { Navigate, useNavigate, useParams } from 'react-router-dom'

import {
  gameActions,
  selectActiveQuestById,
  selectCurrentDistrictId,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'

function getExecutionCopy(objectiveType: 'delivery' | 'survival') {
  if (objectiveType === 'delivery') {
    return {
      title: 'On-Site Handoff',
      actionLabel: 'Spend the watch and make the handoff',
      duration: 'Duration: 1 watch',
      risk: 'Risk: exposure, betrayal, or being marked by the wrong witnesses.',
      consequence:
        'Consequence: the house gets paid only after the exchange is completed in person.',
      journalLabel: 'The contact is in place. The handoff must happen before the watch turns.',
    }
  }

  return {
    title: 'On-Site Watch',
    actionLabel: 'Hold through the watch',
    duration: 'Duration: 1 watch',
    risk: 'Risk: fatigue, pressure, and local danger while the squad keeps the route open.',
    consequence:
      'Consequence: the job pays only if the squad holds the position through the current watch.',
    journalLabel: 'The contract turns into a waiting game. The house must hold long enough for the job to count.',
  }
}

function formatRemainingExecutionDuration(watches: number | null) {
  if (watches == null || watches <= 0) return null
  return `${watches} ${watches === 1 ? 'watch' : 'watches'} remaining`
}

export function ContractExecutionScreen() {
  const { questId = null } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const activeContract = useAppSelector((state) => selectActiveQuestById(state, questId))
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)

  if (!activeContract?.template) {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Contract Execution</h1>
        <p className="summary">
          No active on-site contract is selected. Return to the Work Board and choose a local job.
        </p>
        <button className="action-button" onClick={() => navigate('/contracts')} type="button">
          Return to Work Board
        </button>
      </section>
    )
  }

  const { template, runtime, displayTitle, incidentDistrictId, objectiveLabel } = activeContract
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') {
    return <Navigate replace to="/contracts" />
  }

  const incidentDistrictName = incidentDistrictId
    ? contentCatalog.districtsById.get(incidentDistrictId)?.name ?? incidentDistrictId
    : 'the job site'
  const isOnSite = Boolean(incidentDistrictId && currentDistrictId === incidentDistrictId)
  const copy = getExecutionCopy(template.objectiveType)
  const remainingExecutionWatches = runtime.context.executionDurationWatches != null
    ? Math.max(0, runtime.context.executionDurationWatches - Math.max(0, runtime.progress.completedSteps - 2))
    : null
  const remainingExecutionDurationLabel = formatRemainingExecutionDuration(remainingExecutionWatches)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>{copy.title}</h1>
      <p className="summary">
        This contract resolves on-site. It consumes the current watch and cannot be settled from the board.
      </p>

      <article className="detail-panel">
        <h2>{displayTitle}</h2>
        <p className="quest-briefing">
          <strong>District:</strong> {incidentDistrictName}
        </p>
        <p className="quest-briefing">
          <strong>Current objective:</strong> {objectiveLabel}
        </p>
        <p className="quest-briefing">{template.briefing}</p>
        <p className="quest-briefing">
          <strong>{copy.duration}</strong>
        </p>
        <p className="quest-briefing">{copy.risk}</p>
        <p className="quest-briefing">{copy.consequence}</p>
      </article>

      {!isOnSite ? (
        <article className="detail-panel">
          <h2>Not On-Site</h2>
          <p className="summary">
            Travel to {incidentDistrictName} before attempting the contract.
          </p>
          {incidentDistrictId ? (
            <button
              className="action-button action-button--primary"
              onClick={() => {
                dispatch(
                  gameActions.updateQuestRuntime({
                    questId: runtime.questId,
                    stageId: 'traveling',
                    currentObjectiveLabel: `Travel to ${incidentDistrictName} and set the local terms in person.`,
                    completedSteps: 1,
                    appendJournalEntry: `The house moves toward ${incidentDistrictName}.`,
                  }),
                )
                dispatch(gameActions.travelToDistrict(incidentDistrictId))
                navigate(`/district/${incidentDistrictId}`)
              }}
              type="button"
            >
              Travel to {incidentDistrictName}
            </button>
          ) : null}
        </article>
      ) : (
        <div className="session-actions">
          {runtime.progress.completedSteps < 2 ? (
            <button
              className="action-button action-button--primary"
              onClick={() => {
                dispatch(gameActions.advanceToOnSiteStep({ questId: runtime.questId }))
              }}
              type="button"
            >
              {template.objectiveType === 'delivery' ? 'Make contact and set the terms' : 'Establish position on-site'}
            </button>
          ) : (
            <>
              <p className="quest-briefing" style={{ opacity: 0.85 }}>
                <strong>Next:</strong> {runtime.currentObjectiveLabel}
              </p>
              {remainingExecutionDurationLabel && (
                <p className="quest-briefing" style={{ opacity: 0.85 }}>
                  <strong>Duration remaining:</strong> {remainingExecutionDurationLabel}
                </p>
              )}
              <button
                className="action-button action-button--primary action-button--cta"
                onClick={() => {
                  dispatch(gameActions.advanceTimeSlot())
                  dispatch(gameActions.resolveContractWithComplicationCheck({
                    questId: runtime.questId,
                  }))
                  navigate('/contracts')
                }}
                type="button"
              >
                {copy.actionLabel}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
