import { useState } from 'react'

import type { selectRosterDetail } from '../../application'
import { selectRelationshipWithPlayer, selectTitleEligibilityForNpc, selectDurabilityTierForNpc } from '../../application'
import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { getWeaponDurabilityMax, getArmorDurabilityMax, getWeaponName, getArmorName } from '../../application/content/equipmentCatalog'
import { ItemSelectionModal } from '../components/ItemSelectionModal'

type NpcDetail = NonNullable<ReturnType<typeof selectRosterDetail>>

const TABS = ['Attributes', 'Skills', 'States', 'Traits', 'Relations'] as const
type Tab = (typeof TABS)[number]

function StatRow({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const fillClass =
    pct < 30 ? 'stat-bar-fill stat-bar-fill-crit'
    : pct < 60 ? 'stat-bar-fill stat-bar-fill-low'
    : 'stat-bar-fill stat-bar-fill-good'

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StateStatRow({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  const pct = Math.round(value)
  const fillClass =
    pct < 30 ? 'stat-bar-fill stat-bar-fill-crit'
    : pct < 60 ? 'stat-bar-fill stat-bar-fill-low'
    : 'stat-bar-fill stat-bar-fill-good'

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

function RelationshipBar({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0
  const isNegative = value < 0
  const fillStyle: React.CSSProperties = {
    width: `${Math.abs(value)}%`,
    backgroundColor: isPositive ? '#4caf50' : isNegative ? '#f44336' : '#9e9e9e',
  }
  const sign = value > 0 ? '+' : ''

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {sign}
        {value}
      </span>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={fillStyle} />
      </div>
    </div>
  )
}

const TRAIT_LABELS: Record<string, string> = {
  discipline: 'disciplined',
  ambition: 'ambitious',
  empathy: 'empathetic',
  ruthlessness: 'ruthless',
  prudence: 'prudent',
  curiosity: 'curious',
  dominance: 'dominant',
  loyalty: 'loyal',
  vanity: 'vain',
  zeal: 'zealous',
}

const TRAIT_LOW_LABELS: Record<string, string> = {
  discipline: 'undisciplined',
  ambition: 'unambitious',
  empathy: 'callous',
  ruthlessness: 'merciful',
  prudence: 'reckless',
  curiosity: 'incurious',
  dominance: 'submissive',
  loyalty: 'disloyal',
  vanity: 'humble',
  zeal: 'indifferent',
}

function getDominantTraitSentences(traits: Record<string, number>): string[] {
  return Object.entries(traits)
    .filter(([, val]) => val > 65 || val < 35)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
    .slice(0, 2)
    .map(([key, val]) => {
      if (val > 65) return `Highly ${TRAIT_LABELS[key] ?? key}.`
      return `Unusually ${TRAIT_LOW_LABELS[key] ?? key}.`
    })
}

function CharacterSection({ detail }: { detail: NpcDetail }) {
  if (!detail.background) return null
  const traitSentences = getDominantTraitSentences(detail.traits)

  return (
    <div style={{ padding: '0.75rem 0 0.75rem', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-secondary)', margin: '0 0 0.35rem' }}>
        {detail.background}
      </p>
      {traitSentences.length > 0 && (
        <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>
          {traitSentences.join(' ')}
        </p>
      )}
      {detail.motivation && (
        <p style={{ fontSize: 'var(--size-sm)', fontStyle: 'italic', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
          — {detail.motivation}
        </p>
      )}
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

const PLAYER_ASSIGNMENTS = ['idle', 'working', 'training', 'recovering'] as const

const ASSIGNMENT_LABELS: Record<string, string> = {
  idle: 'Available for deployment',
  working: 'Earns Marks, cannot deploy or train',
  training: 'Gains skill, no income',
  recovering: 'Recovering from injury',
}

function AssignmentSelector({ detail }: { detail: NpcDetail }) {
  const dispatch = useAppDispatch()
  const isSystemControlled = detail.assignment === 'deployed' || detail.assignment === 'assigned_title'

  if (isSystemControlled) {
    return (
      <div className="assignment-selector">
        <span className="text-muted">Assignment: {detail.assignment.replace('_', ' ')} (system)</span>
        {detail.assignment === 'assigned_title' && (
          <p className="assignment-warning">This NPC is on title duty and cannot be deployed.</p>
        )}
      </div>
    )
  }

  return (
    <div className="assignment-selector">
      <span className="stat-label">Assignment</span>
      <div className="badge-row">
        {PLAYER_ASSIGNMENTS.map((a) => (
          <button
            key={a}
            type="button"
            className={detail.assignment === a ? 'badge badge-positive' : 'badge'}
            title={ASSIGNMENT_LABELS[a]}
            onClick={() => dispatch(gameActions.setNpcAssignment({ npcId: detail.npcId, assignment: a }))}
          >
            {a}
          </button>
        ))}
      </div>
      {detail.assignment in ASSIGNMENT_LABELS && (
        <p className="text-muted" style={{ fontSize: '0.8em', marginTop: '0.25rem' }}>
          {ASSIGNMENT_LABELS[detail.assignment]}
        </p>
      )}
    </div>
  )
}

function DurabilityPanel({ npcId }: { npcId: string }) {
  const gameState = useAppSelector((state) => state.game)
  const weaponTier = useAppSelector(selectDurabilityTierForNpc(npcId, 'weapon'))
  const armorTier = useAppSelector(selectDurabilityTierForNpc(npcId, 'armor'))
  const npc = gameState.roster.find((r) => r.npcId === npcId)
  if (!npc) return null

  const weaponId = npc.loadout.primaryWeaponId
  const armorId = npc.loadout.armorId
  if (!weaponId && !armorId) return null

  const durabilities = gameState.equippedItemDurabilities
  const weaponDurability = durabilities[npcId]?.['weapon'] ?? 100
  const armorDurability = durabilities[npcId]?.['armor'] ?? 100

  function tierColor(tier: string) {
    if (tier === 'good') return '#4caf50'
    if (tier === 'worn') return '#ff9800'
    if (tier === 'damaged') return '#f44336'
    return '#9e9e9e'
  }

  return (
    <div className="durability-panel">
      <h4>Equipment Condition</h4>
      {weaponId && (
        <div className="stat-row">
          <span className="stat-label">Weapon</span>
          <span className="stat-value" style={{ color: tierColor(weaponTier) }}>
            {weaponDurability}/{getWeaponDurabilityMax(weaponId)} ({weaponTier})
          </span>
        </div>
      )}
      {armorId && (
        <div className="stat-row">
          <span className="stat-label">Armor</span>
          <span className="stat-value" style={{ color: tierColor(armorTier) }}>
            {armorDurability}/{getArmorDurabilityMax(armorId)} ({armorTier})
          </span>
        </div>
      )}
    </div>
  )
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
  const [equipSlot, setEquipSlot] = useState<'primaryWeaponId' | 'secondaryWeaponId' | 'armorId' | null>(null)
  const relationship = useAppSelector(selectRelationshipWithPlayer(detail.npcId))

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
      </div>

      <div className="npc-stats-column">
        <CharacterSection detail={detail} />
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
                  <div className="stat-bar-fill stat-bar-fill-good" style={{ width: `${val}%` }} />
                </div>
                {val >= 75 && (
                  <span className="badge badge-positive" title={`High ${key}`}>▲</span>
                )}
                {val <= 25 && (
                  <span className="badge badge-warning" title={`Low ${key}`}>▼</span>
                )}
              </div>
            ))}
          {activeTab === 'Relations' && (
            <div>
              <RelationshipBar label="Affinity" value={relationship.affinity} />
              <RelationshipBar label="Respect" value={relationship.respect} />
              <RelationshipBar label="Fear" value={relationship.fear} />
              <RelationshipBar label="Trust" value={relationship.trust} />
              <RelationshipBar label="Loyalty" value={relationship.loyalty} />
            </div>
          )}
        </div>

        <div className="npc-quick-actions">
          <AssignmentSelector detail={detail} />
          <DurabilityPanel npcId={detail.npcId} />
          <TitlePanel detail={detail} />
          <div className="equip-actions">
            <button
              className="action-button"
              type="button"
              onClick={() => setEquipSlot('primaryWeaponId')}
            >
              Primary: {getWeaponName(detail.loadout?.primaryWeaponId ?? null) ?? '— None'}
            </button>
            <button
              className="action-button"
              type="button"
              onClick={() => setEquipSlot('secondaryWeaponId')}
            >
              Secondary: {getWeaponName(detail.loadout?.secondaryWeaponId ?? null) ?? '— None'}
            </button>
            <button
              className="action-button"
              type="button"
              onClick={() => setEquipSlot('armorId')}
            >
              Armor: {getArmorName(detail.loadout?.armorId ?? null) ?? '— None'}
            </button>
          </div>
          {equipSlot && (
            <ItemSelectionModal
              npcId={detail.npcId}
              slot={equipSlot}
              onClose={() => setEquipSlot(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
