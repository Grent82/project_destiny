import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { selectRosterDetail } from '../../application'
import { getJobForNpc } from '../../application/content/jobCatalog'
import { selectRelationshipWithPlayer, selectKnownAssociates, selectTitleEligibilityForNpc, selectDurabilityTierForNpc } from '../../application'
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

const FACTION_CLASS_MAP: Record<string, string> = {
  'faction-civic-compact': 'compact',
  'faction-gilded-court': 'gilded',
  'faction-foundry-league': 'foundry',
  'faction-tallow-ring': 'tallow',
  'faction-restored': 'restored',
}

function factionClass(factionAffinityId: string | null): string {
  return factionAffinityId ? (FACTION_CLASS_MAP[factionAffinityId] ?? 'neutral') : 'neutral'
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
      {detail.assignment === 'working' && (() => {
        const job = getJobForNpc(detail.skills as Record<string, number>)
        const income = Math.max(3, Math.min(15, Math.floor(
          Math.max(...['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics']
            .map((s) => (detail.skills as Record<string, number>)[s] ?? 0)) / 7
        )))
        return (
          <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-body)', fontSize: 'var(--size-sm)', color: 'var(--text-muted)' }}>
            <div>Job: {job.name}</div>
            <div>District: {job.districtHint}</div>
            <div>Est. daily: ~{income} Mk</div>
          </div>
        )
      })()}
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
  const [showAssociates, setShowAssociates] = useState(false)
  const relationship = useAppSelector(selectRelationshipWithPlayer(detail.npcId))
  const knownAssociates = useAppSelector(selectKnownAssociates(detail.npcId))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const dialogueTree = contentCatalog.dialoguesByNpcId.get(detail.npcId)

  function handleTalk() {
    if (!dialogueTree) return
    dispatch(gameActions.startDialogue({ dialogueId: dialogueTree.id, nodeId: dialogueTree.openingNodeId }))
    navigate('/dialogue')
  }

  return (
    <div className="npc-detail-panel">
      <div className="npc-portrait-column">
        <div
          className={[
            'npc-portrait-placeholder',
            `npc-portrait-placeholder--${factionClass(detail.factionAffinityId)}`,
            detail.npcId === 'npc-marion-vale' ? 'npc-portrait-placeholder--primary' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        >
          {(() => {
            const portraitId = detail.npcId.replace('npc-', '');
            const src = `/portraits/${portraitId}.jpg`;
            return (
              <img
                src={src}
                alt={detail.name}
                className="npc-portrait-img"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'block'); }}
              />
            );
          })()}
          <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="npc-silhouette" style={{ display: 'none' }}>
            <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor" opacity="0.6"/>
            <path d="M28 32 Q50 15 72 32 Q68 50 50 52 Q32 50 28 32Z" fill="currentColor" opacity="0.5"/>
            <path d="M22 55 Q50 48 78 55 L85 130 H15 Z" fill="currentColor" opacity="0.45"/>
            <path d="M18 58 Q30 52 50 50 Q70 52 82 58 L80 72 Q65 65 50 64 Q35 65 20 72Z" fill="currentColor" opacity="0.55"/>
          </svg>
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

        {detail.assignment === 'training' && (
          <p style={{ fontSize: 'var(--size-sm)', fontStyle: 'italic', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
            Training — Day {detail.wagesOwedDays} of ~7 until next stat tick
          </p>
        )}

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
              <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>With You</h4>
              <RelationshipBar label="Affinity" value={relationship.affinity} />
              <RelationshipBar label="Respect" value={relationship.respect} />
              <RelationshipBar label="Fear" value={relationship.fear} />
              <RelationshipBar label="Trust" value={relationship.trust} />
              <RelationshipBar label="Loyalty" value={relationship.loyalty} />
              {knownAssociates.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="npc-tab"
                    style={{ width: '100%', textAlign: 'left', marginBottom: '0.5rem' }}
                    type="button"
                    onClick={() => setShowAssociates((v) => !v)}
                  >
                    {showAssociates ? '▾' : '▸'} Known Associates ({knownAssociates.length})
                  </button>
                  {showAssociates && (
                    <div className="associates-list">
                      {knownAssociates.map((assoc) => (
                        <div key={assoc.npcId} className="associate-entry">
                          <strong className="associate-name">{assoc.name}</strong>
                          <div className="associate-axes">
                            <span title="Trust">Tr {assoc.axes.trust > 0 ? '+' : ''}{assoc.axes.trust}</span>
                            <span title="Affinity">Af {assoc.axes.affinity > 0 ? '+' : ''}{assoc.axes.affinity}</span>
                            <span title="Loyalty">Lo {assoc.axes.loyalty > 0 ? '+' : ''}{assoc.axes.loyalty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="npc-quick-actions">
          <AssignmentSelector detail={detail} />
          {detail.assignment === 'training' && (
            <div className="training-focus-panel">
              <label htmlFor={`training-focus-${detail.npcId}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Training Focus
              </label>
              <select
                id={`training-focus-${detail.npcId}`}
                className="action-button"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={detail.trainingFocus ?? ''}
                onChange={(e) =>
                  dispatch(gameActions.setNpcTrainingFocus({ npcId: detail.npcId, skill: e.target.value || null }))
                }
              >
                <option value="">— Any skill (random) —</option>
                {Object.keys(detail.skills).map((skill) => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>
          )}
          <DurabilityPanel npcId={detail.npcId} />
          <TitlePanel detail={detail} />
          {dialogueTree && (
            <button className="action-button" type="button" onClick={handleTalk}>
              Talk
            </button>
          )}
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
