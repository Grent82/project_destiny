import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  gameActions,
  selectActiveInvestigationQuest,
  selectLastInvestigationResult,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { selectInvestigationApproaches } from '../../application/selectors/investigation'
import type { InvestigationApproach } from '../../application/commands/investigation'
import { formatMarks } from '../../domain/game/currency'

export function InvestigationScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const data = useAppSelector(selectActiveInvestigationQuest)
  const lastResultData = useAppSelector(selectLastInvestigationResult)
  const roster = useAppSelector((s) => s.game.roster)
  const activeQuestRuntime = useAppSelector((state) =>
    data ? state.game.activeQuests.find((quest) => quest.questId === data.investigation.questId) ?? null : null,
  )
  const currentDistrictId = useAppSelector((s) => s.game.currentDistrictId)
  const investigationQuestId = data?.investigation.questId ?? lastResultData?.result.questId ?? null
  const investigationApproaches = selectInvestigationApproaches(investigationQuestId)

  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([])

  if (!data && !lastResultData) {
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

  if (!data && lastResultData) {
    const { result, template } = lastResultData
    const chosenApproach = result.chosenApproachId
      ? investigationApproaches.find((approach) => approach.id === result.chosenApproachId)
      : undefined
    const bonusType = chosenApproach?.bonusType ?? 'none'
    const successReward = bonusType === 'extra_marks'
      ? Math.floor((template?.rewardMarks ?? 0) * 1.25)
      : (template?.rewardMarks ?? 0)

    function handleReturnFromResult() {
      dispatch(gameActions.clearLastInvestigationResult())
      navigate('/contracts')
    }

    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Investigation Complete</h1>

        {result.outcome === 'success' && (
          <div className="detail-panel">
            <h2>What Was Found</h2>
            {result.clueText && <p className="summary">{result.clueText}</p>}
            <p>Reward received: <strong>{formatMarks(successReward)}</strong>
              {bonusType === 'extra_marks' && <span className="badge badge--bonus"> +25% network bonus</span>}
            </p>
          </div>
        )}
        {result.outcome === 'partial' && (
          <div className="detail-panel">
            <h2>A Partial Lead</h2>
            <p className="summary">
              Something was recovered — enough to act on, but not the full picture.
            </p>
            <p>Partial reward received: <strong>{formatMarks(Math.floor((template?.rewardMarks ?? 0) / 2))}</strong>.</p>
          </div>
        )}
        {result.outcome === 'failure' && (
          <div className="detail-panel">
            <h2>Nothing Came of It</h2>
            <p className="summary">
              The trail went cold. The opportunity is lost.
              {bonusType === 'reduce_penalty'
                ? ' The paper trail kept the house deniable — no standing lost.'
                : template?.rewardStandingFactionId
                  ? ' Standing penalty applied.'
                  : ''}
            </p>
          </div>
        )}

        {result.operativeResults.length > 0 && (
          <div className="detail-panel">
            <h2>Operative Breakdown</h2>
            <div className="mission-list">
              {result.operativeResults.map((operative) => (
                <div key={operative.npcId} className="mission-row">
                  <div>
                    <strong>{operative.operativeName}</strong>
                    <p className="summary">
                      {operative.skillUsed} {operative.skillValue} · roll {operative.rollValue} · effective {operative.effectiveRoll}
                    </p>
                  </div>
                  <span className={`badge${operative.outcome === 'success' ? ' badge-positive' : operative.outcome === 'failure' ? ' badge-warning' : ''}`}>
                    {operative.outcome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="action-button" onClick={handleReturnFromResult} type="button">
          Return to Contracts
        </button>
      </section>
    )
  }

  if (!data) {
    return null
  }

  const { investigation, template } = data
  const rollResult = investigation.rollResult
  const stage = investigation.stage ?? 'approach-selection'
  const chosenApproachId = investigation.chosenApproachId ?? null
  const chosenApproach: InvestigationApproach | undefined = chosenApproachId
    ? investigationApproaches.find((a) => a.id === chosenApproachId)
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
  const discoveredClues =
    activeQuestRuntime?.clues.filter((clue) => clue.discovered).map((clue) => clue.label) ?? []

  function toggleNpc(npcId: string) {
    setSelectedNpcIds((prev) =>
      prev.includes(npcId) ? prev.filter((id) => id !== npcId) : [...prev, npcId],
    )
  }

  function handleChooseApproach(approachId: string) {
    dispatch(gameActions.chooseInvestigationApproach({ approachId }))
  }

  function handleRun() {
    dispatch(gameActions.advanceTimeSlot())
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

    const lastJournalEntry = null
    const lastClue = investigation.clueText ?? null

    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>Investigation Complete</h1>

        {rollResult === 'success' && (
          <div className="detail-panel">
            <h2>What Was Found</h2>
            {lastClue && <p className="summary">{lastClue}</p>}
            {lastJournalEntry && <p className="summary" style={{ opacity: 0.85 }}>{lastJournalEntry}</p>}
            <p>Reward received: <strong>{formatMarks(successReward)}</strong>
              {bonusType === 'extra_marks' && <span className="badge badge--bonus"> +25% network bonus</span>}
            </p>
          </div>
        )}
        {rollResult === 'partial' && (
          <div className="detail-panel">
            <h2>A Partial Lead</h2>
            <p className="summary">
              Something was recovered — enough to act on, but not the full picture.
              {lastJournalEntry && ` ${lastJournalEntry}`}
            </p>
            <p>Partial reward received: <strong>{formatMarks(Math.floor((template?.rewardMarks ?? 0) / 2))}</strong>.</p>
          </div>
        )}
        {rollResult === 'failure' && (
          <div className="detail-panel">
            <h2>Nothing Came of It</h2>
            <p className="summary">
              The trail went cold. The opportunity is lost.
              {bonusType === 'reduce_penalty'
                ? ' The paper trail kept the house deniable — no standing lost.'
                : template?.rewardStandingFactionId
                  ? ' Standing penalty applied.'
                  : ''}
            </p>
            {lastJournalEntry && <p className="summary" style={{ opacity: 0.75 }}>{lastJournalEntry}</p>}
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
    const districtName = investigation.districtId
      ? contentCatalog.districtsById.get(investigation.districtId)?.name ?? districtLabel
      : null

    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>{template?.title ?? 'Investigation'}</h1>
        <p className="summary">{template?.briefing}</p>

        {districtName && (
          <div className="detail-panel">
            <p><strong>Location:</strong> {districtName}</p>
            <p className="summary" style={{ opacity: 0.8 }}>
              The work happens on-site. Travel to {districtName} before committing your operatives.
            </p>
            {districtMismatch && (
              <button
                className="action-button"
                onClick={() => {
                  dispatch(gameActions.travelToDistrict(investigation.districtId!))
                  navigate(`/district/${investigation.districtId}`)
                }}
                type="button"
              >
                Travel to {districtName} →
              </button>
            )}
          </div>
        )}

        <h2>Choose Your Approach</h2>
        <p className="summary">
          Each method shapes how your people work — and what it costs when things go wrong.
        </p>

        <div className="overview-grid">
          {investigationApproaches.map((approach) => (
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

      {discoveredClues.length > 0 && (
        <div className="detail-panel">
          <h2>Operational Leads</h2>
          <ul className="quest-journal-list">
            {discoveredClues.map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ul>
        </div>
      )}

      {districtMismatch && districtLabel && (
        <div className="warning-banner">
          <p>This investigation takes place in <strong>{districtLabel}</strong>. Your people are not on-site.</p>
          {investigation.districtId && (
            <button
              className="action-button action-button--primary"
              onClick={() => {
                dispatch(gameActions.travelToDistrict(investigation.districtId!))
                navigate(`/district/${investigation.districtId}`)
              }}
              type="button"
            >
              Travel to {contentCatalog.districtsById.get(investigation.districtId)?.name ?? districtLabel} →
            </button>
          )}
        </div>
      )}

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Send Your People</h2>
          <p className="summary">
            Select investigators with strong <strong>{primarySkills.join(' / ')}</strong>.
            {chosenApproach && (
              <span> {chosenApproach.label} requires people who can {chosenApproach.description.toLowerCase().split('.')[0]}.</span>
            )}
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
          <p>Reward: <strong>{formatMarks(template?.rewardMarks ?? 0)}</strong>
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
