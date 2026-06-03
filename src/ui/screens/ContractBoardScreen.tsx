import { useNavigate } from 'react-router-dom'

import {
  selectAvailableQuestLeads,
  gameActions,
  selectActiveQuests,
  selectCompletedQuestIds,
  selectCurrentDistrictId,
} from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { getQuestDaysRemaining } from '../../application/commands/questUtils'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { VenueContextBanner } from './VenueContextBanner'
import { formatMarks } from '../../domain/game/currency'

const FACTION_SHORT_NAMES: Record<string, string> = {
  'faction-civic-compact': 'Compact',
  'faction-gilded-court': 'Court',
  'faction-foundry-league': 'League',
  'faction-tallow-ring': 'Ring',
  'faction-restored': 'Restored',
}

const CITY_DIAL_LABELS: Record<'prosperity' | 'unrest' | 'control' | 'corruption', string> = {
  prosperity: 'Prosperity',
  unrest: 'Unrest',
  control: 'Control',
  corruption: 'Corruption',
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


function formatLeadFreshnessLabel(freshness: 'fresh' | 'aging' | 'stale') {
  switch (freshness) {
    case 'fresh':
      return 'Fresh lead'
    case 'aging':
      return 'Aging lead'
    case 'stale':
      return 'Stale lead'
  }
}

function formatSignedDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

function formatExecutionDuration(days: number | null | undefined, watches: number | null | undefined) {
  if (days != null) {
    return `${days} ${days === 1 ? 'day' : 'days'} of fieldwork`
  }

  if (watches != null) {
    return `${watches} ${watches === 1 ? 'watch' : 'watches'} on-site`
  }

  return null
}

function resolveReadinessBadge(readiness: { state: string; blocked: boolean }) {
  switch (readiness.state) {
    case 'combat-aftermath':
      return { label: 'Combat aftermath', className: 'badge badge-warning' }
    case 'combat-setback':
      return { label: 'Regroup required', className: 'badge badge-warning' }
    default:
      return {
        label: readiness.blocked ? 'Blocked' : 'Ready now',
        className: `badge ${readiness.blocked ? 'badge-warning' : 'badge-positive'}`,
      }
  }
}

export function ContractBoardScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const availableQuestLeads = useAppSelector(selectAvailableQuestLeads)
  const activeQuests = useAppSelector(selectActiveQuests)
  const completedQuestIds = useAppSelector(selectCompletedQuestIds)
  const currentDistrictId = useAppSelector(selectCurrentDistrictId)
  const activeCombat = useAppSelector((state) => state.game.activeCombat)
  const currentDay = useAppSelector((state) => state.game.day)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Work Board</h1>
      <p className="summary">
        Active contracts first — what the house has already taken on. Below that, leads that have not yet been accepted.
      </p>
      <VenueContextBanner />

      <div className="overview-grid">
        <article className="detail-panel">
          <h2>Active Contracts</h2>
          {activeQuests.length === 0 ? (
            <p className="summary">No contracts in hand. Accept a lead to begin work.</p>
          ) : (
            <div className="mission-list">
              {activeQuests.map(({ runtime, template, presentation, displayTitle, objectiveLabel, incidentDistrictId, readiness }) => {
                const isStory = template?.questType === 'story'
                const isUrgent = (template?.timeLimitDays ?? 99) <= 2
                const readinessBadge = resolveReadinessBadge(readiness)
                const daysRemaining = template != null
                  ? getQuestDaysRemaining(runtime, template, currentDay)
                  : null
                const executionDurationLabel = formatExecutionDuration(
                  runtime.context.executionDurationDays,
                  runtime.context.executionDurationWatches,
                )
                const factionImpactEntries = runtime.aftermath?.factionImpacts ?? []
                const worldConsequenceEntries = [
                  ...(template?.rewardCityDialId && template.rewardCityDialDelta !== 0
                    ? [{ label: CITY_DIAL_LABELS[template.rewardCityDialId], delta: template.rewardCityDialDelta }]
                    : []),
                ]
                return (
                <div key={runtime.questId} className={`mission-row${isStory ? ' mission-row--story' : ''}`}>
                  <div className="mission-row-header">
                    <strong>{displayTitle}</strong>
                    {isStory && <span className="badge badge-story">◆ House Obligation</span>}
                    {!isStory && <FactionBadge factionId={template?.employerFactionId ?? null} />}
                    <span className={`badge ${runtime.objectiveMet ? 'badge-positive' : 'badge-warning'}`}>
                      {runtime.objectiveMet ? 'Objective met' : 'Active'}
                    </span>
                    <span className={readinessBadge.className}>
                      {readinessBadge.label}
                    </span>
                    {isUrgent && <span className="badge badge-warning">Urgent</span>}
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
                  {objectiveLabel && (
                    <p className="quest-briefing">
                      <strong>Current objective:</strong> {objectiveLabel}
                    </p>
                  )}
                  <p className="quest-briefing">
                    <strong>Next step:</strong> {readiness.label}
                  </p>
                  <p className="quest-briefing" style={{ opacity: 0.82 }}>
                    {readiness.detail}
                  </p>
                  {presentation && (
                    <>
                      <p className="quest-briefing"><strong>Issuer:</strong> {presentation.issuerLabel}</p>
                      <p className="quest-briefing"><strong>Origin:</strong> {presentation.originLabel}</p>
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
                      <span>Reward: <strong>{formatMarks(template.rewardMarks)}</strong></span>
                    )}
                    {template?.timeLimitDays != null && (
                      <span>Time limit: <strong>{template.timeLimitDays} days</strong></span>
                    )}
                    {executionDurationLabel && (
                      <span>Execution duration: <strong>{executionDurationLabel}</strong></span>
                    )}
                    {daysRemaining != null && (
                      <span>Days remaining: <strong>{daysRemaining}</strong></span>
                    )}
                    {incidentDistrictId && (
                      <span>
                        District: {contentCatalog.districtsById.get(incidentDistrictId)?.name ?? incidentDistrictId}
                      </span>
                    )}
                  </div>
                  <div className="quest-journal-block">
                    <h3>Quest Journal</h3>
                    {runtime.journalEntries.length === 0 ? (
                      <p className="summary">No journal entries recorded yet.</p>
                    ) : (
                      <ol className="quest-journal-list">
                        {runtime.journalEntries.map((entry, index) => (
                          <li key={`${runtime.questId}-journal-${index}`}>{entry}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="quest-journal-block">
                    <h3>Consequence History</h3>
                    {runtime.aftermath?.narrativeSummary ? (
                      <p className="summary">{runtime.aftermath.narrativeSummary}</p>
                    ) : (
                      <p className="summary">No lasting consequences logged yet.</p>
                    )}
                    {factionImpactEntries.length > 0 && (
                      <ul className="quest-journal-list">
                        {factionImpactEntries.map((impact, index) => {
                          const factionName =
                            contentCatalog.factionsById.get(impact.factionId)?.name ??
                            FACTION_SHORT_NAMES[impact.factionId] ??
                            impact.factionId
                          return (
                            <li key={`${runtime.questId}-faction-impact-${index}`}>
                              <strong>Faction impact:</strong> {factionName} {formatSignedDelta(impact.delta)}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {worldConsequenceEntries.length > 0 && (
                      <ul className="quest-journal-list">
                        {worldConsequenceEntries.map((impact, index) => (
                          <li key={`${runtime.questId}-world-impact-${index}`}>
                            <strong>World consequence:</strong> {impact.label} {formatSignedDelta(impact.delta)}
                          </li>
                        ))}
                      </ul>
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
                    (() => {
                      const targetDistrictId = incidentDistrictId ?? template?.districtId ?? null
                      const incidentDistrictName = targetDistrictId
                        ? contentCatalog.districtsById.get(targetDistrictId)?.name ?? targetDistrictId
                        : 'incident site'
                      const hasOngoingEncounter =
                        activeCombat?.outcome === 'ongoing' && activeCombat.linkedQuestId === runtime.questId
                      if (hasOngoingEncounter) {
                        return (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => navigate(`/missions/${runtime.questId}`)}
                            type="button"
                          >
                            Resume on-site encounter →
                          </button>
                        )
                      }

                      if (readiness.state === 'combat-aftermath') {
                        return (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => navigate(readiness.route)}
                            type="button"
                          >
                            Review combat aftermath →
                          </button>
                        )
                      }

                      if (readiness.state === 'combat-setback') {
                        return (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => navigate(readiness.route)}
                            type="button"
                          >
                            Regroup and redeploy →
                          </button>
                        )
                      }

                      if (targetDistrictId && currentDistrictId !== targetDistrictId) {
                        return (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => {
                              dispatch(gameActions.updateQuestRuntime({
                                questId: runtime.questId,
                                stageId: 'traveling',
                                currentObjectiveLabel: `Travel to ${incidentDistrictName} and establish the squad on-site.`,
                                completedSteps: 1,
                                appendJournalEntry: `The house moves toward ${incidentDistrictName}. The incident must be met in person.`,
                              }))
                              dispatch(gameActions.travelToDistrict(targetDistrictId))
                              navigate(`/district/${targetDistrictId}`)
                            }}
                            type="button"
                          >
                            Travel to incident site →
                          </button>
                        )
                      }

                      return (
                        <button
                          className="action-button action-button--primary"
                          onClick={() => {
                            dispatch(gameActions.updateQuestRuntime({
                              questId: runtime.questId,
                              stageId: 'on-site-prep',
                              currentObjectiveLabel: 'The house is on-site. Ready the squad before the clash begins.',
                              completedSteps: 2,
                              appendJournalEntry: 'The incident site is reached. The squad can now prepare on-site.',
                            }))
                            navigate(`/missions/${runtime.questId}`)
                          }}
                          type="button"
                        >
                          Open on-site prep →
                        </button>
                      )
                    })()
                  )}
                  {(template?.objectiveType === 'delivery' || template?.objectiveType === 'survival') && (() => {
                    const inDistrict = !template.districtId || template.districtId === currentDistrictId
                    const label = template.objectiveType === 'delivery' ? 'Open on-site handoff →' : 'Open on-site watch →'
                    const hint = template.districtId && !inDistrict
                      ? `Travel to ${template.districtId.replace('district-', '').replace(/-/g, ' ')} first`
                      : undefined
                    return (
                      <button
                        className="action-button action-button--primary"
                        onClick={() => navigate(`/contracts/${runtime.questId}/execute`)}
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

        <article className="detail-panel">
          <h2>Available Leads</h2>
          {availableQuestLeads.length === 0 ? (
            <p className="summary">No fresh leads at the moment. Work is either already in hand or not yet surfaced.</p>
          ) : (
            <div className="mission-list">
              {availableQuestLeads.map(({ lead, template, presentation }) => {
                const discoveryDistrictName = lead.discoveryDistrictId
                  ? contentCatalog.districtsById.get(lead.discoveryDistrictId)?.name ?? lead.discoveryDistrictId
                  : null

                return (
                <div key={lead.leadId} className="mission-row">
                  <div className="mission-row-header">
                    <strong>{template.title}</strong>
                    {template.questType === 'story' && (
                      <span className="badge badge-story">◆ House Obligation</span>
                    )}
                    <span className="badge">{presentation.categoryLabel}</span>
                    <span className={`badge ${lead.freshness === 'stale' ? 'badge-warning' : lead.freshness === 'aging' ? 'badge-warning' : 'badge-positive'}`}>
                      {formatLeadFreshnessLabel(lead.freshness)}
                    </span>
                    {template.timeLimitDays != null && template.timeLimitDays <= 2 && (
                      <span className="badge badge-warning">Urgent</span>
                    )}
                    {template.riskLevel && <span className="badge">{template.riskLevel} risk</span>}
                  </div>
                  <p className="quest-briefing"><strong>Issuer:</strong> {presentation.issuerLabel}</p>
                  <p className="quest-briefing"><strong>Payer:</strong> {presentation.payerLabel}</p>
                  <p className="quest-briefing"><strong>Origin:</strong> {presentation.originLabel}</p>
                  <p className="quest-briefing"><strong>Stakeholder:</strong> {presentation.stakeholderLabel}</p>
                  <p className="quest-briefing"><strong>Why now:</strong> {presentation.whyNow}</p>
                  <p className="quest-briefing"><strong>What they want:</strong> {presentation.employerIntent}</p>
                  <p className="quest-briefing"><strong>Likely fallout:</strong> {presentation.likelyConsequence}</p>
                  <div className="quest-meta">
                    {template.rewardMarks > 0 && <span>Reward: <strong>{formatMarks(template.rewardMarks)}</strong></span>}
                    {template.timeLimitDays != null && <span>Time limit: <strong>{template.timeLimitDays} days</strong></span>}
                    <span>Surfaced: <strong>Day {lead.discoveredDay}</strong></span>
                    {lead.expiresOnDay != null && <span>Withdraws after: <strong>Day {lead.expiresOnDay}</strong></span>}
                    {discoveryDistrictName && <span>Found in: <strong>{discoveryDistrictName}</strong></span>}
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
