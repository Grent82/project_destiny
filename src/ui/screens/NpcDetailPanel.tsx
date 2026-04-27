import { useState } from 'react'

import type { selectRosterDetail } from '../../application'

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
            Object.entries(detail.states).map(([key, val]) => (
              <StatRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} />
            ))}

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
          <button className="action-button" type="button" disabled>
            Assign title
          </button>
          <button className="action-button" type="button" disabled>
            Equip gear
          </button>
        </div>
      </div>
    </div>
  )
}
