import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  gameActions,
  selectActiveInvestigationQuest,
} from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { INVESTIGATION_APPROACHES, type InvestigationApproach } from '../../application/commands/investigation'

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
        <p className="eyebrow">House Valdris</p>
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
  const stage = investigation.stage ?? 'approach-selection'
  const chosenApproachId = investigation.chosenApproachId ?? null
  const chosenApproach: InvestigationApproach | undefined = chosenApproachId
    ? INVESTIGATION_APPROACHES.find((a) => a.id === chosenApproachId)
    : undefined

  const idleRoster = roster.filter(
    (npc) => npc.assignment === 'idle' || npc.assignment === 'working',
  )

  const districtMismatch =
    investigation.districtId !== null && currentDistrictId !== investigation.districtId

  const districtLabel = investigation.districtId
    ? investigation.districtId.replace('district-', '').replace(/-/g, ' ')
    : null

  const primarySkills = chosenApproach?.primarySkills ?? ['intrigue', 'security', 'administration', 'negotiation']

  function toggleNpc(npcId: string) {
    setSelectedNpcIds((prev) =>
      prev.includes(npcId) ? prev.filter((id) => id !== npcId) : [...prev, npcId],
    )
  }

  function handleChooseApproach(approachId: string) {
    dispatch(gameActions.chooseInvestigationApproach({ approachId }))
  }

  function handleRun() {
    dispatch(gameActions.resolveInvestigation({ npcIds: selectedNpcIds }))
  }

  function handleReturn() {
    navigate('/contracts')
  }

  // Step 3 — show result
  if (rollResult !== 'pending') {
    const bonusType = chosenApproach?.bonusType ?? 'none'
    const successReward = bonusType === 'extra_marks'
      ? Math.floor((template?.rewardMarks ?? 0) * 1.25)
      : (template?.rewardMarks ?? 0)

    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Investigation Complete</h1>

        {rollResult === 'success' && (
          <div className="detail-panel">
            <p className="summary">The matter is resolved.</p>
            <p>Reward received: <strong>{successReward} Marks</strong>
              {bonusType === 'extra_marks' && <span className="badge badge--bonus"> +25% network bonus</span>}
            </p>
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
            <p>
              The opportunity is lost.
              {bonusType === 'reduce_penalty'
                ? ' The paper trail kept the house deniable — no standing lost.'
                : template?.rewardStandingFactionId
                  ? ' Standing penalty applied.'
                  : ''}
            </p>
          </div>
        )}

        <button className="action-button" onClick={handleReturn} type="button">
          Return to Contracts
        </button>
      </section>
    )
  }

  // Step 1 — approach selection
  if (stage === 'approach-selection') {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>{template?.title ?? 'Investigation'}</h1>
        <p className="summary">{template?.briefing}</p>

        <h2>Choose Your Approach</h2>
        <p className="summary">
          Each method shapes how your people work — and what it costs when things go wrong.
        </p>

        <div className="overview-grid">
          {INVESTIGATION_APPROACHES.map((approach) => (
            <article key={approach.id} className="detail-panel">
              <h3>{approach.label}</h3>
              <p className="summary">{approach.description}</p>
              <div className="skill-pills">
                {approach.primarySkills.map((skill) => (
                  <span key={skill} className="badge">{skill}</span>
                ))}
                <span className={`badge badge--risk-${approach.exposureRisk}`}>
                  exposure: {approach.exposureRisk}
                </span>
                {approach.difficultyModifier !== 0 && (
                  <span className={`badge ${approach.difficultyModifier > 0 ? 'badge--bonus' : 'badge--penalty'}`}>
                    roll {approach.difficultyModifier > 0 ? '+' : ''}{approach.difficultyModifier}
                  </span>
                )}
              </div>
              <button
                className="action-button"
                onClick={() => handleChooseApproach(approach.id)}
                type="button"
              >
                Use this approach
              </button>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // Step 2 — clue revealed, assign operatives
  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>{template?.title ?? 'Investigation'}</h1>

      {investigation.clueText && (
        <div className="detail-panel">
          <h2>A Lead Surfaces</h2>
          <p className="summary">{investigation.clueText}</p>
          {chosenApproach && (
            <p><strong>Approach:</strong> {chosenApproach.label}</p>
          )}
        </div>
      )}

      {districtMismatch && districtLabel && (
        <div className="warning-banner">
          You must be in <strong>{districtLabel}</strong> to run this investigation.
        </div>
      )}

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Send Your People</h2>
          <p className="summary">
            Select investigators with strong <strong>{primarySkills.join(' / ')}</strong>.
          </p>

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
                      {primarySkills.map((skill) => (
                        <span key={skill} className="badge">
                          {skill}: {npc.skills[skill as keyof typeof npc.skills] ?? 0}
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
          <p>Reward: <strong>{template?.rewardMarks ?? 0} Marks</strong>
            {chosenApproach?.bonusType === 'extra_marks' && (
              <span className="badge badge--bonus"> +25% on success</span>
            )}
          </p>
          {template?.rewardStandingFactionId && (
            <p>Standing: <strong>+{template.rewardStandingDelta}</strong> with{' '}
              {template.rewardStandingFactionId.replace('faction-', '').replace(/-/g, ' ')}
            </p>
          )}
          {template?.penaltyStandingDelta !== undefined && template.penaltyStandingDelta !== 0 && (
            <p className="text-warning">
              Failure penalty: <strong>{template.penaltyStandingDelta}</strong> standing
              {chosenApproach?.bonusType === 'reduce_penalty' && (
                <span className="badge"> waived (paper trail)</span>
              )}
            </p>
          )}
        </article>
      </div>

      <button
        className="action-button"
        disabled={selectedNpcIds.length === 0 || districtMismatch}
        title={
          districtMismatch
            ? 'Selected operatives are not in this district. Assign them here first.'
            : selectedNpcIds.length === 0
              ? 'Select at least one operative to run the investigation.'
              : undefined
        }
        onClick={handleRun}
        type="button"
      >
        Run the Investigation
      </button>
    </section>
  )
}
