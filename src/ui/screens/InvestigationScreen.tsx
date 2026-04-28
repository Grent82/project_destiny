import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  gameActions,
  selectActiveInvestigationQuest,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const INVESTIGATION_SKILLS = ['intrigue', 'security', 'administration', 'negotiation'] as const

export function InvestigationScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const data = useAppSelector(selectActiveInvestigationQuest)
  const roster = useAppSelector((s) => s.game.roster)
  const currentDistrictId = useAppSelector((s) => s.game.currentDistrictId)

  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([])

  if (!data) {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdric</p>
        <h1>Investigation</h1>
        <p className="summary">No investigation is currently active.</p>
        <button className="action-button" onClick={() => navigate('/contracts')} type="button">
          Return to Contracts
        </button>
      </section>
    )
  }

  const { investigation, template } = data
  const rollResult = investigation.rollResult

  const idleRoster = roster.filter(
    (npc) => npc.assignment === 'idle' || npc.assignment === 'working',
  )

  const districtMismatch =
    investigation.districtId !== null && currentDistrictId !== investigation.districtId

  const districtLabel = investigation.districtId
    ? investigation.districtId.replace('district-', '').replace(/-/g, ' ')
    : null

  function toggleNpc(npcId: string) {
    setSelectedNpcIds((prev) =>
      prev.includes(npcId) ? prev.filter((id) => id !== npcId) : [...prev, npcId],
    )
  }

  function handleRun() {
    dispatch(gameActions.resolveInvestigation({ npcIds: selectedNpcIds }))
  }

  function handleReturn() {
    navigate('/contracts')
  }

  if (rollResult !== 'pending') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdric</p>
        <h1>Investigation Complete</h1>

        {rollResult === 'success' && (
          <div className="detail-panel">
            <p className="summary">The matter is resolved.</p>
            <p>Full reward received: <strong>{template?.rewardMarks ?? 0} Marks</strong>.</p>
          </div>
        )}
        {rollResult === 'partial' && (
          <div className="detail-panel">
            <p className="summary">Something was recovered, not everything.</p>
            <p>Partial reward received: <strong>{Math.floor((template?.rewardMarks ?? 0) / 2)} Marks</strong>.</p>
          </div>
        )}
        {rollResult === 'failure' && (
          <div className="detail-panel">
            <p className="summary">Nothing came of it.</p>
            <p>The opportunity is lost.{template?.rewardStandingFactionId ? ' Standing penalty applied.' : ''}</p>
          </div>
        )}

        <button className="action-button" onClick={handleReturn} type="button">
          Return to Contracts
        </button>
      </section>
    )
  }

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>{template?.title ?? 'Investigation'}</h1>
      <p className="summary">{template?.briefing}</p>

      {districtMismatch && districtLabel && (
        <div className="warning-banner">
          You must be in <strong>{districtLabel}</strong> to run this investigation.
        </div>
      )}

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Send Your People</h2>
          <p className="summary">Select investigators from your idle roster.</p>

          {idleRoster.length === 0 ? (
            <p className="summary">No idle personnel available.</p>
          ) : (
            <div className="mission-list">
              {idleRoster.map((npc) => {
                const isSelected = selectedNpcIds.includes(npc.npcId)
                return (
                  <div
                    key={npc.npcId}
                    className={`mission-row${isSelected ? ' mission-row--selected' : ''}`}
                  >
                    <label className="npc-select-label">
                      <input
                        checked={isSelected}
                        onChange={() => toggleNpc(npc.npcId)}
                        type="checkbox"
                      />
                      <strong>{npc.name}</strong>
                    </label>
                    <div className="skill-pills">
                      {INVESTIGATION_SKILLS.map((skill) => (
                        <span key={skill} className="badge">
                          {skill}: {npc.skills[skill]}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>Stakes</h2>
          <p>Reward: <strong>{template?.rewardMarks ?? 0} Marks</strong></p>
          {template?.rewardStandingFactionId && (
            <p>Standing: <strong>+{template.rewardStandingDelta}</strong> with{' '}
              {template.rewardStandingFactionId.replace('faction-', '').replace(/-/g, ' ')}
            </p>
          )}
          {template?.penaltyStandingDelta !== undefined && template.penaltyStandingDelta !== 0 && (
            <p className="text-warning">Failure penalty: <strong>{template.penaltyStandingDelta}</strong> standing</p>
          )}
        </article>
      </div>

      <button
        className="action-button"
        disabled={selectedNpcIds.length === 0 || districtMismatch}
        onClick={handleRun}
        type="button"
      >
        Run the Investigation
      </button>
    </section>
  )
}
