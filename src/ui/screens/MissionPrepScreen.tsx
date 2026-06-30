import { useState, useMemo } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

import {
  gameActions,
  selectActionTimeCost,
  selectCombatScreenState,
  selectCurrentDistrictId,
  selectMissionPrepSummary,
  selectSquadCohesion,
  selectActiveQuestById,
  selectThreatNpcForQuest,
  squadRules,
} from '../../application'
import { selectNpcStateThresholds } from '../../application'
import { checkLineTheyWontCross } from '../../application/npc/checkLineTheyWontCross'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { contentCatalog } from '../../application/content/contentCatalog'
import { formatNpcAssignmentLabel } from '../../application/content/assignmentDisplay'
import { PortraitFallback } from '../components/PortraitFallback'
import { hasPortraitAvailable } from '../components/portraitUtils'

export function MissionPrepScreen() {
  const { questId = null } = useParams<{ questId: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const combatState = useAppSelector(selectCombatScreenState)
  const summary = useAppSelector(selectMissionPrepSummary)
  const cohesion = useAppSelector(selectSquadCohesion)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const activeContract = useAppSelector((state) => selectActiveQuestById(state, questId))
  const threatNpc = useAppSelector((state) => selectThreatNpcForQuest(state, questId))
  const incidentDistrictId = activeContract?.incidentDistrictId ?? null
  const incidentDistrictName = incidentDistrictId
    ? contentCatalog.districtsById.get(incidentDistrictId)?.name ?? incidentDistrictId
    : null
  const isOnSite = Boolean(incidentDistrictId && currentDistrictId === incidentDistrictId)
  const hasOngoingEncounter =
    combatState.hasActiveCombat && combatState.outcome === 'ongoing'

  // Derive action context tags from the active contract briefing for lineTheyWontCross check
  const missionContextTags = useMemo(() => {
    const brief = [
      activeContract?.template?.briefing ?? '',
      activeContract?.displayTitle ?? '',
      activeContract?.objectiveLabel ?? '',
    ].join(' ').toLowerCase()
    return brief.split(/\W+/).filter((w) => w.length > 3)
  }, [activeContract])

  const NPC_STATE_THRESHOLDS = selectNpcStateThresholds()
  const [proceededDespiteConflict, setProceededDespiteConflict] = useState(false)

  const squadConflicts = useMemo(() => {
    if (proceededDespiteConflict) return []
    return summary.selectedSquad.flatMap((entry) => {
      const line = checkLineTheyWontCross(entry.npcId, missionContextTags)
      return line ? [{ name: entry.name, line }] : []
    })
  }, [summary.selectedSquad, missionContextTags, proceededDespiteConflict])

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Squad Deployment</h1>
      <p className="summary">
        Assemble your unit and commit to the engagement only after reaching the incident site.
      </p>

      {activeContract?.template ? (
        <div className="contract-context-banner">
          <p className="contract-context-label">On-site deployment for</p>
          <strong className="contract-context-title">{activeContract.displayTitle}</strong>
          {activeContract.presentation && (
            <>
              <p className="contract-context-briefing"><strong>Issuer:</strong> {activeContract.presentation.issuerLabel}</p>
              <p className="contract-context-briefing"><strong>Origin:</strong> {activeContract.presentation.originLabel}</p>
              <p className="contract-context-briefing"><strong>Why now:</strong> {activeContract.presentation.whyNow}</p>
              <p className="contract-context-briefing"><strong>What they want:</strong> {activeContract.presentation.employerIntent}</p>
            </>
          )}
          {incidentDistrictName && (
            <p className="contract-context-briefing">
              <strong>Incident site:</strong> {incidentDistrictName}
            </p>
          )}
          {activeContract.objectiveLabel && (
            <p className="contract-context-briefing">
              <strong>Current objective:</strong> {activeContract.objectiveLabel}
            </p>
          )}
          <p className="contract-context-briefing">{activeContract.template.briefing}</p>
        </div>
      ) : (
        <div className="contract-context-banner contract-context-banner--empty">
          <p className="contract-context-label">
            No on-site incident selected —{' '}
            <NavLink className="nav-link-inline" to="/contracts">
              visit the Work Board first
            </NavLink>
            .
          </p>
        </div>
      )}
      {threatNpc && (
        <div className="threat-panel">
          <p className="threat-panel__label">Known Threat</p>
          <div className="threat-panel__body">
            {hasPortraitAvailable() ? (
              <div className="threat-panel__portrait npc-portrait-placeholder">
                <img
                  alt={threatNpc.name}
                  className="npc-portrait-img"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  src={`/portraits/${threatNpc.id.replace('npc-', '')}.jpg`}
                />
              </div>
            ) : (
              <PortraitFallback
                npcId={threatNpc.id}
                factionId={threatNpc.factionId ?? null}
                nameOverride={threatNpc.name}
                size="medium"
              />
            )}
            <div className="threat-panel__info">
              <strong className="threat-panel__name">{threatNpc.name}</strong>
              {threatNpc.factionName && (
                <span className="threat-panel__faction">{threatNpc.factionName}</span>
              )}
              {threatNpc.motivation && (
                <p className="threat-panel__motivation">
                  "{threatNpc.motivation.immediatePressure ?? threatNpc.motivation.publicGoal ?? ''}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="summary">
        Squad size: {summary.selectedSquad.length}/{squadRules.maxSquadSize}
      </p>
      <p className="squad-cohesion">Squad cohesion: {cohesion}/100</p>
      {incidentDistrictName && (
        <p className="summary">
          <strong>Current site:</strong> {currentDistrictId
            ? contentCatalog.districtsById.get(currentDistrictId)?.name ?? currentDistrictId
            : 'None'}
          {' '}· <strong>Required:</strong> {incidentDistrictName}
        </p>
      )}
      {activeContract?.runtime && (
        <p className="summary">
          <strong>Funnel step:</strong> {activeContract.runtime.stageId.replace(/-/g, ' ')}
        </p>
      )}

      {squadConflicts.length > 0 && (
        <div role="alert" style={{ margin: '0.75rem 0', padding: '0.6rem 0.75rem', background: 'var(--color-danger-bg, #2d1010)', border: '1px solid var(--color-danger, #c0392b)', borderRadius: '4px' }}>
          {squadConflicts.map(({ name, line }) => (
            <p key={name} style={{ margin: '0 0 0.35rem', fontSize: 'var(--size-sm)', color: 'var(--color-danger, #e74c3c)', fontStyle: 'italic' }}>
              <strong>{name}:</strong> {line}
            </p>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              className="action-button"
              onClick={() => setProceededDespiteConflict(true)}
              type="button"
            >
              Proceed anyway
            </button>
            <button
              className="action-button"
              onClick={() => {
                const firstConflictNpcId = summary.selectedSquad.find((e) =>
                  checkLineTheyWontCross(e.npcId, missionContextTags)
                )?.npcId
                if (firstConflictNpcId) {
                  dispatch(gameActions.removeNpcFromSelectedSquad(firstConflictNpcId))
                }
              }}
              type="button"
            >
              Change order
            </button>
          </div>
        </div>
      )}

      <div className="session-actions">
        <p className="mission-time-cost-note">
          <strong>Time cost:</strong> Committing squad costs <strong>{selectActionTimeCost('combat')} slot</strong>{' '}
          {(() => {
            const slot = summary.selectedSquad.length > 0 ? 'on deployment' : ''
            return slot
          })()}
        </p>
        <button
          className="action-button action-button--primary action-button--cta"
          disabled={
            !activeContract?.runtime ||
            summary.selectedSquad.length === 0 ||
            (!hasOngoingEncounter && !isOnSite)
          }
          title={
            !activeContract?.runtime
              ? 'Select an accepted contract at the incident site first.'
              : summary.selectedSquad.length === 0
                ? 'Select at least one squad member before deploying.'
                : !hasOngoingEncounter && !isOnSite
                  ? `Travel to ${incidentDistrictName ?? 'the incident site'} first.`
                  : undefined
          }
          onClick={() => {
            if (!activeContract?.runtime) return
            dispatch(gameActions.updateQuestRuntime({
              questId: activeContract.runtime.questId,
              stageId: hasOngoingEncounter ? 'engaged' : 'on-site-prep',
              currentObjectiveLabel: hasOngoingEncounter
                ? 'Return to the active encounter and finish the clash.'
                : 'The squad is assembled on-site. Commit when ready.',
              completedSteps: 2,
              appendJournalEntry: hasOngoingEncounter
                ? 'The squad regroups and returns to the ongoing fight.'
                : 'The squad reaches the incident site and prepares to strike.',
            }))
            dispatch(gameActions.startCombatEncounter({ questId: activeContract.runtime.questId }))
            navigate('/combat')
          }}
          type="button"
        >
          {hasOngoingEncounter ? 'Resume on-site encounter' : 'Commit squad on-site'}
        </button>
      </div>

      <div className="mission-prep-layout">
        <article className="detail-panel">
          <h2>Incident Flow</h2>
          {!activeContract?.runtime ? (
            <p className="summary">Choose a contract from the Work Board before opening on-site preparation.</p>
          ) : (
            <div className="mission-list">
              <div className="mission-row">
                <strong>1. Accept the contract</strong>
                <span className="badge badge-positive">Done</span>
              </div>
              <div className="mission-row">
                <strong>2. Reach the incident site</strong>
                <span className={`badge ${isOnSite ? 'badge-positive' : 'badge-warning'}`}>
                  {isOnSite ? 'On-site' : `Travel to ${incidentDistrictName ?? 'the district'}`}
                </span>
              </div>
              <div className="mission-row">
                <strong>3. Ready the squad</strong>
                <span className={`badge ${summary.selectedSquad.length > 0 ? 'badge-positive' : 'badge-warning'}`}>
                  {summary.selectedSquad.length > 0 ? 'Squad ready' : 'Select operatives'}
                </span>
              </div>
              <div className="mission-row">
                <strong>4. Enter the encounter</strong>
                <span className={`badge ${hasOngoingEncounter ? 'badge-positive' : 'badge-warning'}`}>
                  {hasOngoingEncounter ? 'Encounter active' : 'Waiting on commitment'}
                </span>
              </div>
              {!isOnSite && incidentDistrictId && (
                <div className="mission-row">
                  <strong>Travel now</strong>
                  <button
                    className="action-button"
                    onClick={() => {
                      dispatch(gameActions.updateQuestRuntime({
                        questId: activeContract.runtime.questId,
                        stageId: 'traveling',
                        currentObjectiveLabel: `Travel to ${incidentDistrictName ?? 'the incident site'} and establish the squad on-site.`,
                        completedSteps: 1,
                        appendJournalEntry: `The house moves toward ${incidentDistrictName ?? 'the incident site'}.`,
                      }))
                      dispatch(gameActions.travelToDistrict(incidentDistrictId))
                      navigate(`/district/${incidentDistrictId}`)
                    }}
                    type="button"
                  >
                    Travel to {incidentDistrictName ?? 'incident site'}
                  </button>
                </div>
              )}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>The Deployed</h2>
          <div className="mission-list">
            {summary.selectedSquad.map((entry) => (
              <div key={entry.npcId} className="mission-row">
                <strong>{entry.name}</strong>
                <span>{formatNpcAssignmentLabel(entry.assignment)}</span>
                <span>Morale {entry.morale}</span>
                <span>Stress {entry.stress}</span>
                <button
                  className="action-button"
                  onClick={() =>
                    dispatch(gameActions.removeNpcFromSelectedSquad(entry.npcId))
                  }
                  type="button"
                >
                  Remove from squad
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>On Hand</h2>
          <div className="mission-list">
            {summary.availableRoster.length > 0 ? (
              summary.availableRoster.map((entry) => (
                <div key={entry.npcId} className="mission-row">
                  <strong>{entry.name}</strong>
                  <span>{formatNpcAssignmentLabel(entry.assignment)}</span>
                  <span>
                    Loyalty {entry.loyalty}
                    {entry.loyalty <= NPC_STATE_THRESHOLDS.LOYALTY_REFUSE_DEPLOY_THRESHOLD && (
                      <span className="badge badge-crit" title="Loyalty too low — deployment blocked">⛔</span>
                    )}
                    {entry.loyalty > NPC_STATE_THRESHOLDS.LOYALTY_REFUSE_DEPLOY_THRESHOLD &&
                      entry.loyalty <= NPC_STATE_THRESHOLDS.LOYALTY_DEPLOY_WARNING_THRESHOLD && (
                      <span className="badge badge-warning" title="Low loyalty — may refuse orders">⚠</span>
                    )}
                  </span>
                  <button
                    className="action-button"
                    disabled={
                      entry.loyalty <= NPC_STATE_THRESHOLDS.LOYALTY_REFUSE_DEPLOY_THRESHOLD ||
                      entry.assignment === 'assigned_title'
                    }
                    onClick={() =>
                      dispatch(gameActions.addNpcToSelectedSquad(entry.npcId))
                    }
                    type="button"
                  >
                    {entry.assignment === 'assigned_title' ? 'On Duty' : 'Add to squad'}
                  </button>
                </div>
              ))
            ) : (
              <p className="summary">All seeded operatives are currently assigned to the squad.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
