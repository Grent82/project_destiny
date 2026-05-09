import { useNavigate } from 'react-router-dom'

import {
  selectAvailableQuestLeads,
  gameActions,
  selectActiveQuests,
  selectCompletedQuestIds,
  selectCurrentDistrictId,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { VenueContextBanner } from './VenueContextBanner'

const FACTION_SHORT_NAMES: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

function FactionBadge({ factionId }: { factionId: string | null }) {
  if (!factionId) return <span className="badge">Independent</span>
  const label = FACTION_SHORT_NAMES[factionId] ?? factionId
  const modifierKey = factionId.replace('faction-', '')
  const modifierClass = `faction-badge--${modifierKey}`
  return (
    <span className={`faction-badge ${modifierClass}`}>
      {label}
    </span>
  )
}

export function ContractBoardScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const availableQuestLeads = useAppSelector(selectAvailableQuestLeads)
  const activeQuests = useAppSelector(selectActiveQuests)
  const completedQuestIds = useAppSelector(selectCompletedQuestIds)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Work Board</h1>
      <p className="summary">
        Contracts the house has taken on. Obligations, briefings, and what is owed if you fail.
      </p>
      <VenueContextBanner />

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Available Leads</h2>
          <p className="summary" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            These are the contracts and obligations currently on the board. Read who sent them, where they came from, and why they matter before taking one into the house ledger.
          </p>
          {availableQuestLeads.length === 0 ? (
            <p className="summary">No fresh leads at the moment. Work is either already in hand or not yet surfaced.</p>
          ) : (
            <div className="mission-list">
              {availableQuestLeads.map(({ template, presentation }) => (
                <div key={template.id} className="mission-row">
                  <div className="mission-row-header">
                    <strong>{template.title}</strong>
                    <span className="badge">{presentation.categoryLabel}</span>
                    {template.riskLevel && <span className="badge">{template.riskLevel} risk</span>}
                  </div>
                  <p className="quest-briefing"><strong>Issuer:</strong> {presentation.issuerLabel}</p>
                  <p className="quest-briefing"><strong>Origin:</strong> {presentation.originLabel}</p>
                  <p className="quest-briefing"><strong>Why now:</strong> {presentation.whyNow}</p>
                  <p className="quest-briefing"><strong>What they want:</strong> {presentation.employerIntent}</p>
                  <div className="quest-meta">
                    {template.rewardMarks > 0 && <span>Reward: <strong>{template.rewardMarks} Marks</strong></span>}
                    {template.timeLimitDays != null && <span>Time limit: <strong>{template.timeLimitDays} days</strong></span>}
                    {template.districtId && (
                      <span>
                        District: {contentCatalog.districtsById.get(template.districtId)?.name ?? template.districtId}
                      </span>
                    )}
                  </div>
                  <button
                    className="action-button action-button--primary"
                    onClick={() => dispatch(gameActions.acceptQuest({ questId: template.id }))}
                    type="button"
                  >
                    Accept contract
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="detail-panel">
          <h2>Active Contracts</h2>
          <p className="summary" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Contracts are found in the field — at guild halls, taverns, courts, and through contacts in each district.
          </p>
          {activeQuests.length === 0 ? (
            <p className="summary">No contracts currently in progress. Explore the districts to find work.</p>
          ) : (
            <div className="mission-list">
              {activeQuests.map(({ runtime, template, presentation }) => {
                const isStory = template?.questType === 'story'
                return (
                <div key={runtime.questId} className={`mission-row${isStory ? ' mission-row--story' : ''}`}>
                  <div className="mission-row-header">
                    <strong>{template?.title ?? runtime.questId}</strong>
                    {isStory && <span className="badge badge-story">◆ House Obligation</span>}
                    {!isStory && <FactionBadge factionId={template?.employerFactionId ?? null} />}
                    <span className={`badge ${runtime.objectiveMet ? 'badge-positive' : 'badge-warning'}`}>
                      {runtime.objectiveMet ? 'Objective met' : 'Active'}
                    </span>
                    {template?.riskLevel && (
                      <span className="badge">{template.riskLevel} risk</span>
                    )}
                  </div>
                  {isStory && template?.openingText && (
                    <p className="quest-briefing quest-opening-text">
                      {template.openingText}
                    </p>
                  )}
                  {template?.flavorNote && (
                    <p className="quest-briefing" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                      {template.flavorNote}
                    </p>
                  )}
                  {presentation && (
                    <>
                      <p className="quest-briefing"><strong>Issuer:</strong> {presentation.issuerLabel}</p>
                      <p className="quest-briefing"><strong>Origin:</strong> {presentation.originLabel}</p>
                      <p className="quest-briefing"><strong>Why now:</strong> {presentation.whyNow}</p>
                      <p className="quest-briefing"><strong>What they want:</strong> {presentation.employerIntent}</p>
                    </>
                  )}
                  {template?.briefing && !isStory && (
                    <p className="quest-briefing">{template.briefing}</p>
                  )}
                  {isStory && !template?.openingText && template?.briefing && (
                    <p className="quest-briefing">{template.briefing}</p>
                  )}
                  <div className="quest-meta">
                    {template?.rewardMarks != null && template.rewardMarks > 0 && (
                      <span>Reward: <strong>{template.rewardMarks} Marks</strong></span>
                    )}
                    {template?.timeLimitDays != null && (
                      <span>Time limit: <strong>{template.timeLimitDays} days</strong> (accepted day {runtime.acceptedOnDay})</span>
                    )}
                    {template?.districtId && (
                      <span>District: {template.districtId.replace('district-', '').replace(/-/g, ' ')}</span>
                    )}
                  </div>
                  {template?.objectiveType === 'investigation' && (
                    <button
                      className="action-button"
                      onClick={() => {
                        dispatch(gameActions.startInvestigation({ questId: runtime.questId }))
                        navigate('/investigation')
                      }}
                      type="button"
                    >
                      Investigate
                    </button>
                  )}
                  {template?.objectiveType === 'combat' && (
                    <button
                      className="action-button action-button--primary"
                      onClick={() => navigate('/combat')}
                      type="button"
                    >
                      Deploy Squad →
                    </button>
                  )}
                  {(template?.objectiveType === 'delivery' || template?.objectiveType === 'survival') && (() => {
                    const inDistrict = !template.districtId || template.districtId === currentDistrictId
                    const label = template.objectiveType === 'delivery' ? 'Complete Delivery' : 'Complete Job'
                    const hint = template.districtId && !inDistrict
                      ? `Travel to ${template.districtId.replace('district-', '').replace(/-/g, ' ')} first`
                      : undefined
                    return (
                      <button
                        className="action-button action-button--primary"
                        onClick={() => dispatch(gameActions.resolveSimpleContract({ questId: runtime.questId }))}
                        disabled={!inDistrict}
                        title={hint}
                        type="button"
                      >
                        {label}
                      </button>
                    )
                  })()}
                </div>
                )
              })}
            </div>
          )}
        </article>

        {completedQuestIds.length > 0 && (
          <article className="detail-panel">
            <h2>Closed Contracts</h2>
            <div className="mission-list">
              {completedQuestIds.map((id) => {
                const template = contentCatalog.questsById?.get(id)
                const label = template?.title ?? id.replace('quest-', '').replace(/-/g, ' ')
                return (
                  <div key={id} className="mission-row mission-row-header">
                    <span className="quest-closed-label">{label}</span>
                    <span className="badge badge--closed">Closed</span>
                  </div>
                )
              })}
            </div>
          </article>
        )}

      </div>
    </section>
  )
}
