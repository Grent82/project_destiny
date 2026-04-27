import { useState } from 'react'

import type { selectRosterDetail } from '../../application'
import { selectTitleEligibilityForNpc } from '../../application'
import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { useAppDispatch, useAppSelector } from '../app/hooks'

type NpcDetail = NonNullable<ReturnType<typeof selectRosterDetail>>

const TABS = ['Attributes', 'Skills', 'States', 'Traits'] as const
type Tab = (typeof TABS)[number]

function StatRow({ label, value }: { label: string; value: number }) {
  const fillClass =
    value < 20 ? 'stat-bar-fill stat-bar-fill-crit'
    : value < 40 ? 'stat-bar-fill stat-bar-fill-low'
    : 'stat-bar-fill'

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar">
        <div className={fillClass} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function StateStatRow({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  const fillClass =
    value < 20 ? 'stat-bar-fill stat-bar-fill-crit'
    : value < 40 ? 'stat-bar-fill stat-bar-fill-low'
    : 'stat-bar-fill'

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {warn && <span title="Threshold exceeded — consequences active">⚠</span>}
      <div className="stat-bar">
        <div className={fillClass} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function portraitInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface NpcDetailPanelProps {
  detail: NpcDetail
}

function TitlePanel({ detail }: { detail: NpcDetail }) {
  const [showList, setShowList] = useState(false)
  const dispatch = useAppDispatch()
  const eligibility = useAppSelector(selectTitleEligibilityForNpc(detail.npcId))
  const activeTitleDef = detail.activeTitle
    ? contentCatalog.titlesById.get(detail.activeTitle)
    : null

  return (
    <div className="title-panel">
      {activeTitleDef ? (
        <div className="title-active">
          <span className="badge badge-positive" title={activeTitleDef.dailyEffect}>
            {activeTitleDef.name}
          </span>
          <button
            className="action-button action-button-sm"
            type="button"
            onClick={() => dispatch(gameActions.revokeTitle({ npcId: detail.npcId }))}
          >
            Revoke
          </button>
        </div>
      ) : (
        <button
          className="action-button"
          type="button"
          onClick={() => setShowList((v) => !v)}
        >
          {showList ? 'Cancel' : 'Assign Title'}
        </button>
      )}

      {showList && !activeTitleDef && (
        <div className="title-list">
          {eligibility.eligible.length === 0 && eligibility.ineligible.length === 0 && (
            <p className="text-muted">No titles defined.</p>
          )}
          {eligibility.eligible.map((title) => (
            <button
              key={title.id}
              className="title-option"
              type="button"
              title={title.dailyEffect}
              onClick={() => {
                dispatch(gameActions.assignTitle({ npcId: detail.npcId, titleId: title.id }))
                setShowList(false)
              }}
            >
              <strong>{title.name}</strong>
              <span className="text-muted"> — {title.description}</span>
            </button>
          ))}
          {eligibility.ineligible.map((title) => (
            <div key={title.id} className="title-option title-option-ineligible" title={title.reason}>
              <strong>{title.name}</strong>
              <span className="text-muted"> — {title.description}</span>
              <small className="title-ineligible-reason">{title.reason}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NpcDetailPanel({ detail }: NpcDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Attributes')

  return (
    <div className="npc-detail-panel">
      <div className="npc-portrait-column">
        <div className="npc-portrait-placeholder" aria-hidden="true">
          {portraitInitials(detail.name)}
        </div>

        <p className="npc-identity-name">{detail.name}</p>

        <div className="badge-row">
          <span className="badge">{detail.status}</span>
          <span className="badge">{detail.assignment.replace('_', ' ')}</span>
        </div>

        {detail.factionAffinity && (
          <span className="text-muted">{detail.factionAffinity}</span>
        )}

        <p className="text-muted">{detail.origin}</p>
        <p className="text-muted">{detail.background}</p>
      </div>

      <div className="npc-stats-column">
        <div className="npc-tab-bar" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'npc-tab npc-tab-active' : 'npc-tab'}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="npc-tab-content" role="tabpanel">
          {activeTab === 'Attributes' &&
            Object.entries(detail.attributes).map(([key, val]) => (
              <StatRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} />
            ))}

          {activeTab === 'Skills' &&
            Object.entries(detail.skills).map(([key, val]) => (
              <StatRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} />
            ))}

          {activeTab === 'States' &&
            Object.entries(detail.states).map(([key, val]) => {
              const warn =
                (key === 'hunger' && val > NPC_STATE_THRESHOLDS.HUNGER_COMBAT_PENALTY_THRESHOLD) ||
                (key === 'fear' && val > NPC_STATE_THRESHOLDS.FEAR_REFUSE_ADVANCE_THRESHOLD) ||
                (key === 'stress' && val > NPC_STATE_THRESHOLDS.STRESS_MORALE_DECAY_THRESHOLD) ||
                (key === 'fatigue' && val > NPC_STATE_THRESHOLDS.FATIGUE_ACCURACY_PENALTY_THRESHOLD)
              return (
                <StateStatRow
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={val}
                  warn={warn}
                />
              )
            })}

          {activeTab === 'Traits' &&
            Object.entries(detail.traits).map(([key, val]) => (
              <div key={key} className="stat-row">
                <span className="stat-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span className="stat-value">{val}</span>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${val}%` }} />
                </div>
                {val >= 75 && (
                  <span className="badge badge-positive" title={`High ${key}`}>▲</span>
                )}
                {val <= 25 && (
                  <span className="badge badge-warning" title={`Low ${key}`}>▼</span>
                )}
              </div>
            ))}
        </div>

        <div className="npc-quick-actions">
          <TitlePanel detail={detail} />
          <button className="action-button" type="button" disabled>
            Equip gear
          </button>
        </div>
      </div>
    </div>
  )
}
