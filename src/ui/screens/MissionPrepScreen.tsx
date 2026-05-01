import { NavLink, useNavigate } from 'react-router-dom'

import {
  gameActions,
  selectActiveMission,
  selectActiveQuests,
  selectActiveThreatNpc,
  selectAvailableMissions,
  selectCombatScreenState,
  selectMissionPrepSummary,
  selectSquadCohesion,
  squadRules,
} from '../../application'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function MissionPrepScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const combatState = useAppSelector(selectCombatScreenState)
  const summary = useAppSelector(selectMissionPrepSummary)
  const activeMission = useAppSelector(selectActiveMission)
  const missions = useAppSelector(selectAvailableMissions)
  const cohesion = useAppSelector(selectSquadCohesion)
  const activeQuests = useAppSelector(selectActiveQuests)
  const activeContract = activeQuests.length > 0 ? activeQuests[0] : null
  const threatNpc = useAppSelector(selectActiveThreatNpc)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Squad Deployment</h1>
      <p className="summary">
        Assemble your unit and commit to the engagement.
      </p>

      {activeContract?.template ? (
        <div className="contract-context-banner">
          <p className="contract-context-label">Deploying in support of</p>
          <strong className="contract-context-title">{activeContract.template.title}</strong>
          <p className="contract-context-briefing">{activeContract.template.briefing}</p>
        </div>
      ) : (
        <div className="contract-context-banner contract-context-banner--empty">
          <p className="contract-context-label">
            No contract accepted —{' '}
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
            <div className="threat-panel__portrait npc-portrait-placeholder">
              <img
                alt={threatNpc.name}
                className="npc-portrait-img"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                src={`/portraits/${threatNpc.id.replace('npc-', '')}.jpg`}
              />
            </div>
            <div className="threat-panel__info">
              <strong className="threat-panel__name">{threatNpc.name}</strong>
              {threatNpc.factionName && (
                <span className="threat-panel__faction">{threatNpc.factionName}</span>
              )}
              {threatNpc.motivation && (
                <p className="threat-panel__motivation">"{threatNpc.motivation}"</p>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="summary">
        Squad size: {summary.selectedSquad.length}/{squadRules.maxSquadSize}
      </p>
      <p className="squad-cohesion">Squad cohesion: {cohesion}/100</p>

      {activeMission && (
        <p className="summary">
          <strong>Active mission:</strong> {activeMission.title}
        </p>
      )}

      <div className="session-actions">
        <button
          className="action-button action-button--primary action-button--cta"
          disabled={summary.selectedSquad.length === 0} title={summary.selectedSquad.length === 0 ? "Select at least one squad member before deploying" : undefined}
          onClick={() => {
            dispatch(gameActions.startCombatEncounter())
            navigate('/combat')
          }}
          type="button"
        >
          {combatState.hasActiveCombat && combatState.outcome === 'ongoing'
            ? 'Resume encounter'
            : 'Deploy to encounter'}
        </button>
      </div>

      <div className="mission-prep-layout">
        <article className="detail-panel">
          <h2>Available Contracts</h2>
          <div className="mission-list">
            {missions.map((mission) => (
              <div key={mission.id} className="mission-row">
                <strong>{mission.title}</strong>
                <span>Difficulty: {mission.difficulty}</span>
                <span>Reward: <strong>{mission.rewardCredits} Mk</strong></span>
                <span>Standing: +{mission.rewardStanding} / −{mission.penaltyStanding}</span>
                <span>District: {mission.district}</span>
                <button
                  className="action-button"
                  onClick={() => dispatch(gameActions.selectMission(mission.id))}
                  type="button"
                >
                  {activeMission?.id === mission.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>The Deployed</h2>
          <div className="mission-list">
            {summary.selectedSquad.map((entry) => (
              <div key={entry.npcId} className="mission-row">
                <strong>{entry.name}</strong>
                <span>{entry.assignment}</span>
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
                  <span>{entry.assignment}</span>
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
