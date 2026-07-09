import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { selectRosterDetail } from '../../application'
import { formatNpcAssignmentLabel, formatWorkingIncomePerDay, getNpcAssignmentDetail } from '../../application/content/assignmentDisplay'
import { getJobForNpc } from '../../application/content/jobCatalog'
import { selectRelationshipWithPlayer, selectKnownAssociates, selectTitleEligibilityForNpc, selectDurabilityTierForNpc, selectGiftHistoryWithPlayer, selectCourtshipHistoryWithPlayer, selectDeepConversationHistoryWithPlayer, selectNpcHasNewDialogueTopics, selectNpcCharacterDescription, selectEstimatedNpcIncome, selectNpcBondSurface, selectIntimacyStageWithPlayer, selectNpcCaptivityState, selectNpcSocialReachability, selectNpcSocialCooldowns, selectNpcRecoveryStatus } from '../../application'
import { gameActions } from '../../application/store/gameSlice'
import { contentCatalog } from '../../application/content/contentCatalog'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { selectGiftInventoryItems, selectNpcInventoryItems } from '../../application/selectors/inventory'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { getWeaponDurabilityMax, getArmorDurabilityMax, getWeaponName, getArmorName } from '../../application/content/equipmentCatalog'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { ItemSelectionModal } from '../components/ItemSelectionModal'
import { IntimacyOptionsModal } from '../components/IntimacyOptionsModal'
import { DateProposalModal } from '../components/DateProposalModal'
import { PortraitFallback } from '../components/PortraitFallback'
import { hasPortraitAvailable } from '../components/portraitUtils'
import './roster.css'

type NpcDetail = NonNullable<ReturnType<typeof selectRosterDetail>>
type NpcActionMenu = 'talk' | 'time'

const TABS = ['Attributes', 'Skills', 'States', 'Traits', 'Relations'] as const
type Tab = (typeof TABS)[number]

const ATTRIBUTE_TOOLTIPS: Record<string, string> = {
  Might: 'Might — affects melee damage, carrying capacity, and physical feats.',
  Agility: 'Agility — affects evasion, initiative order, and ranged accuracy.',
  Endurance: 'Endurance — affects maximum HP, stamina, and resistance to fatigue.',
  Intellect: 'Intellect — affects skill training speed, tactical options, and investigation.',
  Perception: 'Perception — affects stealth detection, ranged accuracy, and awareness.',
  Presence: 'Presence — affects NPC morale, recruitment success, and social influence.',
  Resolve: 'Resolve — affects resistance to fear, stress, and morale loss.',
}

const STATE_TOOLTIPS: Record<string, string> = {
  Hunger: 'Hunger — rises over time. Above threshold: combat penalties apply.',
  Fear: 'Fear — rises in dangerous situations. Above threshold: NPC may refuse to advance.',
  Stress: 'Stress — rises from hardship. Above threshold: morale decay accelerates.',
  Fatigue: 'Fatigue — rises from activity. Above threshold: accuracy penalties apply.',
}

const TAB_SHORTCUT_KEYS: Record<Tab, string> = {
  Attributes: '1',
  Skills: '2',
  States: '3',
  Traits: '4',
  Relations: '5',
}

function isNpcStateCritical(key: string, value: number): boolean {
  switch (key) {
    case 'hunger':
      return value > NPC_STATE_THRESHOLDS.HUNGER_COMBAT_PENALTY_THRESHOLD
    case 'fear':
      return value > NPC_STATE_THRESHOLDS.FEAR_REFUSE_ADVANCE_THRESHOLD
    case 'stress':
      return value > NPC_STATE_THRESHOLDS.STRESS_MORALE_DECAY_THRESHOLD
    case 'fatigue':
      return value > NPC_STATE_THRESHOLDS.FATIGUE_ACCURACY_PENALTY_THRESHOLD
    default:
      return false
  }
}

function StatRow({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const fillClass =
    pct < 30 ? 'stat-bar-fill stat-bar-fill-crit'
    : pct < 60 ? 'stat-bar-fill stat-bar-fill-low'
    : 'stat-bar-fill stat-bar-fill-good'

  return (
    <div className="stat-row">
      <span className="stat-label" title={ATTRIBUTE_TOOLTIPS[label]}>{label}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StateStatRow({ label, value, warn, negativePolarity = false }: { label: string; value: number; warn: boolean; negativePolarity?: boolean }) {
  const pct = Math.round(value)
  const fillClass = negativePolarity
    ? (pct > 60 ? 'stat-bar-fill stat-bar-fill-crit'
      : pct > 30 ? 'stat-bar-fill stat-bar-fill-low'
      : 'stat-bar-fill stat-bar-fill-good')
    : (pct < 30 ? 'stat-bar-fill stat-bar-fill-crit'
      : pct < 60 ? 'stat-bar-fill stat-bar-fill-low'
      : 'stat-bar-fill stat-bar-fill-good')

  return (
    <div className="stat-row">
      <span className="stat-label" title={STATE_TOOLTIPS[label]}>{label}</span>
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

function CharacterSection({ detail }: { detail: NpcDetail }) {
  const traitSentences = useAppSelector(selectNpcCharacterDescription(detail.npcId))
  if (!detail.background) return null

  return (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-secondary)', margin: '0 0 0.35rem', overflowWrap: 'break-word' }}>
        {detail.background}
      </p>
      {traitSentences.length > 0 && (
        <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-secondary)', margin: '0 0 0.25rem', overflowWrap: 'break-word' }}>
          {traitSentences.join(' ')}
        </p>
      )}
      {detail.quirks.length > 0 && (
        <ul style={{ margin: '0.5rem 0 0', padding: '0 0 0 1rem', fontSize: 'var(--size-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {detail.quirks.map((q) => (
            <li key={q.text}>{q.text}</li>
          ))}
        </ul>
      )}
      {detail.signature && (
        <p style={{ marginTop: '0.75rem', fontSize: 'var(--size-sm)', color: 'var(--text-accent)', fontStyle: 'italic', borderLeft: '2px solid var(--border-accent)', paddingLeft: '0.5rem' }}>
          {detail.signature}
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

function BondStatusSection({ detail }: { detail: NpcDetail }) {
  const dispatch = useAppDispatch()
  const bondSurface = useAppSelector((state) => selectNpcBondSurface(state, detail.npcId))
  const kitchenIsIntact = useAppSelector((state) =>
    state.game.house.rooms.some((room) => room.roomId === 'room-kitchen' && room.state === 'intact'),
  )
  const isAssignedToKitchenService = useAppSelector((state) =>
    state.game.npcRuntimeStates.some(
      (npc) =>
        npc.npcId === detail.npcId &&
        npc.assignment === 'working' &&
        npc.dutyPostRoomId === 'room-kitchen',
    ),
  )

  if (bondSurface.status === 'free') {
    return (
      <>
        <h3 className="muster-section-title">Bond Status</h3>
        <p className="bond-status-copy">Free service. No active bond contract is attached to this operative.</p>
      </>
    )
  }

  const defaultMarketValue = Math.max(bondSurface.marketValue ?? 0, bondSurface.contractValue ?? 0)

  return (
    <>
      <h3 className="muster-section-title">Bond Status</h3>
      {bondSurface.status === 'player-held' ? (
        <>
          <p className="bond-status-copy">Held by {bondSurface.holderName}.</p>
          <p className="bond-status-copy">{bondSurface.entryReasonLabel}.</p>
          <div className="bond-status-facts">
            <span className="badge badge-warning">Contract buyout: {bondSurface.contractValue} Marks</span>
            {bondSurface.termDays !== null && <span className="badge">Term: {bondSurface.termDays} days</span>}
            {bondSurface.marketValue !== null && <span className="badge">Transfer value: {bondSurface.marketValue} Marks</span>}
            {bondSurface.forSale && <span className="badge badge-warning">Marked for transfer</span>}
            {isAssignedToKitchenService && <span className="badge">Assigned to kitchen service</span>}
          </div>
          <div className="bond-status-actions">
            <button
              className="action-button action-button--secondary"
              type="button"
              onClick={() => dispatch(gameActions.freeNpc({ npcId: detail.npcId }))}
              disabled={!bondSurface.canAffordRelease}
              title={!bondSurface.canAffordRelease ? `Need ${bondSurface.contractValue} Marks to release from bond.` : 'Release this NPC from their bond contract.'}
            >
              Release from bond
            </button>
            <button
              className="action-button"
              type="button"
              onClick={() =>
                dispatch(
                  gameActions.markNpcForSale({
                    npcId: detail.npcId,
                    forSale: !bondSurface.forSale,
                    marketValue: defaultMarketValue,
                  }),
                )
              }
            >
              {bondSurface.forSale ? 'Withdraw transfer offer' : 'Offer for transfer'}
            </button>
            {kitchenIsIntact ? (
              <button
                className="action-button"
                type="button"
                onClick={() => {
                  if (isAssignedToKitchenService) {
                    dispatch(gameActions.setNpcDutyPost({ npcId: detail.npcId, roomId: null }))
                    dispatch(gameActions.setNpcAssignment({ npcId: detail.npcId, assignment: 'idle' }))
                    return
                  }
                  dispatch(gameActions.setNpcDutyPost({ npcId: detail.npcId, roomId: 'room-kitchen' }))
                  dispatch(gameActions.setNpcAssignment({ npcId: detail.npcId, assignment: 'working' }))
                }}
              >
                {isAssignedToKitchenService ? 'Remove from food service' : 'Place in food service'}
              </button>
            ) : (
              <button
                className="action-button action-button--secondary"
                type="button"
                disabled
                title="Repair the kitchen before assigning food service."
              >
                Repair kitchen for food service
              </button>
            )}
          </div>
          {!kitchenIsIntact && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
              Repair the kitchen before assigning food service.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="bond-status-copy">Transferred to {bondSurface.holderName}.</p>
          <p className="bond-status-copy">{bondSurface.entryReasonLabel}.</p>
          <div className="bond-status-facts">
            <span className="badge badge-warning">Legal buyout: {bondSurface.ransomCost} Marks</span>
            {bondSurface.marketValue !== null && <span className="badge">Filed value: {bondSurface.marketValue} Marks</span>}
          </div>
          <div className="bond-status-actions">
            <button
              className="action-button action-button--secondary"
              type="button"
              onClick={() => dispatch(gameActions.rescueBondedNpcLegal({ npcId: detail.npcId }))}
              disabled={!bondSurface.canAffordRelease}
              title={!bondSurface.canAffordRelease ? `Need ${bondSurface.ransomCost} Marks for legal buyout.` : 'Buy the NPC\'s freedom through legal channels.'}
            >
              Buy freedom
            </button>
            <button
              className="action-button"
              type="button"
              onClick={() => dispatch(gameActions.rescueBondedNpcExtraction({ npcId: detail.npcId }))}
              title="Stealthily extract the NPC without alerting the holder."
            >
              Extract quietly
            </button>
            <button
              className="action-button action-button--danger"
              type="button"
              onClick={() => dispatch(gameActions.rescueBondedNpcForce({ npcId: detail.npcId }))}
              title="Use force to seize the NPC from the holder."
            >
              Seize by force
            </button>
          </div>
        </>
      )}
    </>
  )
}

function CaptivitySection({ detail }: { detail: NpcDetail }) {
  const captivity = useAppSelector((state) => selectNpcCaptivityState(state, detail.npcId))

  // No captivity state to display
  if (!captivity || captivity.status === 'missing') {
    return null
  }

  // Format condition with color coding
  const getConditionClass = (condition: string) => {
    switch (condition) {
      case 'healthy': return 'badge-positive'
      case 'hurt': return 'badge-warning'
      case 'altered': return 'badge-danger'
      default: return ''
    }
  }

  // Format compliance for display
  const complianceLabels: Record<string, string> = {
    resistant: 'Resistant',
    compliant: 'Compliant',
    broken: 'Broken',
  }

  // Format condition for display
  const conditionLabels: Record<string, string> = {
    healthy: 'Healthy',
    hurt: 'Hurt',
    altered: 'Altered',
  }

  // Format regime for display
  const regimeLabels: Record<string, string> = {
    unknown: 'Unknown',
    hidden: 'Hidden',
    guarded: 'Guarded',
    imprisoned: 'Imprisoned',
  }

  // Get holder name from faction catalog or use ID
  const holderName = captivity.holderId
    ? contentCatalog.factionsById.get(captivity.holderId)?.name ?? captivity.holderId
    : 'Unknown holder'

  // Get site name if available
  const siteLabel = captivity.siteId
    ? captivity.roomId
      ? `${captivity.siteId} — ${captivity.roomId}`
      : captivity.siteId
    : null

  return (
    <>
      <h3 className="muster-section-title">Captivity Status</h3>
      <div className="captivity-status-header">
        <span className={`badge badge-${captivity.status === 'captive' ? 'warning' : 'positive'}`}>
          {captivity.status.charAt(0).toUpperCase() + captivity.status.slice(1)}
        </span>
        {captivity.timeHeldDays > 0 && (
          <span className="badge">Held: {captivity.timeHeldDays} days</span>
        )}
      </div>

      <div className="captivity-details">
        <div className="captivity-fact-row">
          <span className="captivity-label">Holder:</span>
          <span className="captivity-value">{holderName}</span>
        </div>

        {siteLabel && (
          <div className="captivity-fact-row">
            <span className="captivity-label">Location:</span>
            <span className="captivity-value">{siteLabel}</span>
          </div>
        )}

        <div className="captivity-fact-row">
          <span className="captivity-label">Regime:</span>
          <span className="captivity-value">{regimeLabels[captivity.regime] ?? captivity.regime}</span>
        </div>

        <div className="captivity-fact-row">
          <span className="captivity-label">Condition:</span>
          <span className={`badge ${getConditionClass(captivity.condition)}`}>
            {conditionLabels[captivity.condition] ?? captivity.condition}
          </span>
        </div>

        <div className="captivity-fact-row">
          <span className="captivity-label">Compliance:</span>
          <span className="captivity-value">{complianceLabels[captivity.compliance] ?? captivity.compliance}</span>
        </div>

        {captivity.bondType && captivity.bondType !== 'none' && (
          <div className="captivity-fact-row">
            <span className="captivity-label">Bond Type:</span>
            <span className="captivity-value">{captivity.bondType}</span>
          </div>
        )}

        {captivity.lastTransferDay && (
          <div className="captivity-fact-row">
            <span className="captivity-label">Last Transfer:</span>
            <span className="captivity-value">Day {captivity.lastTransferDay}</span>
          </div>
        )}
      </div>

      {/* Confiscated Items */}
      {(captivity.confiscatedItems?.length > 0 ||
        captivity.confiscatedMoney ||
        captivity.confiscatedEquipment?.weapon ||
        captivity.confiscatedEquipment?.armor ||
        (captivity.confiscatedEquipment?.accessory?.length ?? 0) > 0) && (
        <div className="captivity-confiscation">
          <h4 className="captivity-confiscation-title">Confiscated Belongings</h4>

          {captivity.confiscatedItems?.length > 0 && (
            <div className="confiscation-section">
              <span className="confiscation-label">Items:</span>
              <ul className="confiscation-list">
                {captivity.confiscatedItems.map((item, idx) => (
                  <li key={idx} className="confiscation-item">
                    {contentCatalog.itemsById.get(item.itemId)?.name ?? item.itemId}
                    {item.confiscatedDay && ` (Day ${item.confiscatedDay})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {captivity.confiscatedMoney && (
            <div className="confiscation-section">
              <span className="confiscation-label">Money:</span>
              <span className="confiscation-value">
                {captivity.confiscatedMoney.carriedCash} Mk carried, {captivity.confiscatedMoney.savings} Mk saved
              </span>
            </div>
          )}

          {(captivity.confiscatedEquipment?.weapon || captivity.confiscatedEquipment?.armor) && (
            <div className="confiscation-section">
              <span className="confiscation-label">Equipment:</span>
              <ul className="confiscation-list">
                {captivity.confiscatedEquipment.weapon && (
                  <li className="confiscation-item">
                    Weapon: {contentCatalog.itemsById.get(captivity.confiscatedEquipment.weapon)?.name ?? captivity.confiscatedEquipment.weapon}
                  </li>
                )}
                {captivity.confiscatedEquipment.armor && (
                  <li className="confiscation-item">
                    Armor: {contentCatalog.itemsById.get(captivity.confiscatedEquipment.armor)?.name ?? captivity.confiscatedEquipment.armor}
                  </li>
                )}
                {captivity.confiscatedEquipment.accessory?.map((acc, idx) => (
                  <li key={idx} className="confiscation-item">
                    Accessory: {contentCatalog.itemsById.get(acc)?.name ?? acc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function DutySection({ detail }: { detail: NpcDetail }) {
  const dispatch = useAppDispatch()
  const isSystemControlled = detail.assignment === 'deployed' || detail.assignment === 'assigned_title'
  const income = useAppSelector(selectEstimatedNpcIncome(detail.npcId))
  const recoveryStatus = useAppSelector(selectNpcRecoveryStatus(detail.npcId))

  return (
    <>
      <h3 className="muster-section-title">In Service</h3>
      {isSystemControlled ? (
        <div>
          <span className="text-muted">Duty: {formatNpcAssignmentLabel(detail.assignment)} (bound)</span>
          {detail.assignment === 'assigned_title' && (
            <p className="assignment-warning">On title duty — cannot be deployed.</p>
          )}
        </div>
      ) : (
        <>
          <div className="muster-duty-row" role="group" aria-label="Duty">
            {PLAYER_ASSIGNMENTS.map((a) => (
              <button
                key={a}
                type="button"
                className={detail.assignment === a ? 'muster-duty-option muster-duty-option--active' : 'muster-duty-option'}
                title={getNpcAssignmentDetail(a) ?? undefined}
                onClick={() => dispatch(gameActions.setNpcAssignment({ npcId: detail.npcId, assignment: a }))}
              >
                {formatNpcAssignmentLabel(a)}
              </button>
            ))}
          </div>
          {detail.assignment === 'recovering' ? (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
              {recoveryStatus.supportLabel} — {recoveryStatus.statusMessage}
            </p>
          ) : (
            getNpcAssignmentDetail(detail.assignment) && (
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                {getNpcAssignmentDetail(detail.assignment)}
              </p>
            )
          )}
          {detail.assignment === 'working' && (() => {
            const job = getJobForNpc(detail.skills)
            return (
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
                {job.name} · {job.districtHint} · ~{formatWorkingIncomePerDay(income)} a day
              </p>
            )
          })()}
          {detail.assignment === 'training' && (
            <div className="training-focus-panel" style={{ marginTop: '0.5rem' }}>
              <label htmlFor={`training-focus-${detail.npcId}`} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Training focus
                <span
                  style={{ marginLeft: '0.35rem', cursor: 'help', opacity: 0.7 }}
                  title="Set a focus skill for +50% training speed on that skill. Without focus, a random skill improves each day."
                >
                  ⓘ
                </span>
              </label>
              <select
                id={`training-focus-${detail.npcId}`}
                className="action-button"
                style={{ display: 'block', marginTop: '0.25rem', maxWidth: '16rem' }}
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
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                {detail.trainingFocus
                  ? `Focused on ${detail.trainingFocus} — +50% training speed. Day ${detail.wagesOwedDays} of ~7 until the next tick.`
                  : `Day ${detail.wagesOwedDays} of ~7 until the next stat tick.`}
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}

function EquipmentSection({ detail, onOpenSlot }: { detail: NpcDetail; onOpenSlot: (slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId') => void }) {
  const gameState = useAppSelector((state) => state.game)
  const weaponTier = useAppSelector(selectDurabilityTierForNpc(detail.npcId, 'weapon'))
  const armorTier = useAppSelector(selectDurabilityTierForNpc(detail.npcId, 'armor'))
  const durabilities = gameState.equippedItemDurabilities
  const weaponDurability = durabilities[detail.npcId]?.['weapon'] ?? 100
  const armorDurability = durabilities[detail.npcId]?.['armor'] ?? 100
  const primaryId = detail.loadout?.primaryWeaponId ?? null
  const armorId = detail.loadout?.armorId ?? null

  return (
    <>
      <h3 className="muster-section-title">Arms &amp; Armor</h3>
      <div className="muster-equipment-row">
        <button className="muster-slot" type="button" onClick={() => onOpenSlot('primaryWeaponId')}>
          <span className="muster-slot-label">Primary</span>
          <span className="muster-slot-value">{getWeaponName(primaryId) ?? '— unarmed'}</span>
          {primaryId && (
            <span className="muster-slot-condition">
              {weaponDurability}/{getWeaponDurabilityMax(primaryId)} · {weaponTier}
            </span>
          )}
        </button>
        <button className="muster-slot" type="button" onClick={() => onOpenSlot('secondaryWeaponId')}>
          <span className="muster-slot-label">Secondary</span>
          <span className="muster-slot-value">{getWeaponName(detail.loadout?.secondaryWeaponId ?? null) ?? '— none carried'}</span>
        </button>
        <button className="muster-slot" type="button" onClick={() => onOpenSlot('armorId')}>
          <span className="muster-slot-label">Armor</span>
          <span className="muster-slot-value">{getArmorName(armorId) ?? '— unarmored'}</span>
          {armorId && (
            <span className="muster-slot-condition">
              {armorDurability}/{getArmorDurabilityMax(armorId)} · {armorTier}
            </span>
          )}
        </button>
      </div>
    </>
  )
}

/**
 * User-reported live bug (2026-07-09): unequipping an item correctly returns it to the NPC's own
 * personal inventory (npcInventories[npcId] -- verified via Playwright: no data loss, no
 * duplication), but nothing anywhere displayed that data, so from the player's perspective the item
 * "just disappears" the moment it's unequipped. This section closes that gap: it's the only UI
 * surface for npcInventories[npcId], with a "Store" action moving each item into House Storage
 * (moveNpcItemToHouseStorage), where it becomes visible and re-assignable like any other item.
 */
function PersonalEffectsSection({ detail }: { detail: NpcDetail }) {
  const dispatch = useAppDispatch()
  const items = useAppSelector((state) => selectNpcInventoryItems(state, detail.npcId))

  if (items.length === 0) return null

  return (
    <>
      <h3 className="muster-section-title">Personal Effects</h3>
      <p className="summary">Items {detail.name} is carrying but not wearing — store them in House Storage to reassign elsewhere.</p>
      <div className="muster-personal-effects">
        {items.map((item) => {
          const def = contentCatalog.itemsById.get(item.itemId)
          return (
            <div key={item.instanceId} className="muster-personal-effect">
              <span className="muster-personal-effect-name">
                {def?.name ?? item.itemId}
                {item.quantity > 1 ? ` ×${item.quantity}` : ''}
              </span>
              <button
                className="action-button"
                type="button"
                onClick={() => dispatch(gameActions.moveNpcItemToHouseStorage({ npcId: detail.npcId, instanceId: item.instanceId }))}
              >
                Store in House
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function TitlePanel({ detail }: { detail: NpcDetail }) {
  const [showList, setShowList] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
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
            onClick={() => setConfirmRevoke(true)}
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
      {confirmRevoke && activeTitleDef && (
        <ConfirmationModal
          heading={`Revoke ${activeTitleDef.name}?`}
          consequence={`${detail.name} will lose the title and its daily effect: ${activeTitleDef.dailyEffect}. This cannot be undone without reassigning the title.`}
          confirmLabel="Revoke title"
          onConfirm={() => {
            dispatch(gameActions.revokeTitle({ npcId: detail.npcId }))
            setConfirmRevoke(false)
          }}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}
    </div>
  )
}

export function NpcDetailPanel({ detail }: NpcDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Attributes')
  const [equipSlot, setEquipSlot] = useState<'primaryWeaponId' | 'secondaryWeaponId' | 'armorId' | null>(null)
  const [showAssociates, setShowAssociates] = useState(false)
  const [showGiftList, setShowGiftList] = useState(false)
  const [showIntimacyModal, setShowIntimacyModal] = useState(false)
  const [showDateProposalModal, setShowDateProposalModal] = useState(false)
  const [activeActionMenu, setActiveActionMenu] = useState<NpcActionMenu | null>(null)
  const relationship = useAppSelector(selectRelationshipWithPlayer(detail.npcId))
  const intimacyStage = useAppSelector(selectIntimacyStageWithPlayer(detail.npcId))
  const knownAssociates = useAppSelector(selectKnownAssociates(detail.npcId))
  const giftHistory = useAppSelector(selectGiftHistoryWithPlayer(detail.npcId))
  const courtshipHistory = useAppSelector(selectCourtshipHistoryWithPlayer(detail.npcId))
  const deepConversationHistory = useAppSelector(selectDeepConversationHistoryWithPlayer(detail.npcId))
  const giftItems = useAppSelector(selectGiftInventoryItems)
  const reachability = useAppSelector(selectNpcSocialReachability(detail.npcId))
  const cooldowns = useAppSelector(selectNpcSocialCooldowns(detail.npcId))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const dialogueTree = contentCatalog.dialoguesByNpcId.get(detail.npcId)
  const hasNewTopics = useAppSelector(selectNpcHasNewDialogueTopics(detail.npcId))
  const hasCriticalState = Object.entries(detail.states).some(([key, val]) => isNpcStateCritical(key, val))

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const tab = TABS.find((candidate) => TAB_SHORTCUT_KEYS[candidate] === e.key)
      if (!tab) return
      e.preventDefault()
      setActiveTab(tab)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  const canUsePrivateSocialActions = reachability.canUsePrivateActions
  const socialPresenceReason = reachability.blockerMessage
  const canOfferGift = canUsePrivateSocialActions
  const giftUnavailableReason =
    socialPresenceReason ?? (giftItems.length === 0 ? 'Carry a gift item in player inventory to offer one here.' : null)

  const deepConversationOnCooldown = canUsePrivateSocialActions && cooldowns.deepConversationOnCooldown
  const courtshipOnCooldown = canUsePrivateSocialActions && cooldowns.courtshipOnCooldown
  const deepConversationTitle = deepConversationOnCooldown
    ? `You already had a deep conversation with ${detail.name} today. Available again: tomorrow morning.`
    : canUsePrivateSocialActions
    ? 'Share a meaningful conversation about values, fears, dreams, or past. This action does not consume time slots.'
    : socialPresenceReason ?? 'Talk Deeply is unavailable right now.'
  const courtTitle = courtshipOnCooldown
    ? `You already courted ${detail.name} today. Available again: tomorrow morning.`
    : canUsePrivateSocialActions
    ? 'Spend time courting this NPC directly. No time slot cost.'
    : socialPresenceReason ?? 'Court is unavailable right now.'
  const proposeDateTitle = !canUsePrivateSocialActions
    ? socialPresenceReason ?? 'Propose Date is unavailable right now.'
    : intimacyStage === 'none'
    ? 'Build your relationship first before proposing a date.'
    : 'Propose a scheduled date with this NPC. Date-specific costs and duration are shown in the proposal list.'
  const spendNightTitle = !canUsePrivateSocialActions
    ? socialPresenceReason ?? 'Spend Night Together is unavailable right now.'
    : intimacyStage === 'none'
    ? 'Build a deeper bond first before spending the night together.'
    : 'Spend a night together. Consent and final options are confirmed in the next step.'

  const wants = detail.motivation?.publicGoal
  const needs = detail.motivation?.privateNeed
  const hasTalkOptions = true
  const hasSpendTimeOptions = true

  function handleTalk() {
    if (!dialogueTree) return
    dispatch(gameActions.startDialogue({ dialogueId: dialogueTree.id, nodeId: dialogueTree.openingNodeId }))
    navigate('/dialogue')
  }

  function handleSocialAftermath(action: () => void) {
    action()
    setActiveTab('Relations')
  }

  function toggleActionMenu(menu: NpcActionMenu) {
    setActiveActionMenu((current) => {
      const nextMenu = current === menu ? null : menu
      if (nextMenu !== 'time') {
        setShowGiftList(false)
      }
      return nextMenu
    })
  }

  return (
    <div className="muster-leaf-content">
      <header className="muster-leaf-header">
        <div
          className={`muster-portrait-frame npc-portrait-placeholder--${factionClass(detail.factionAffinityId)}`}
          aria-hidden="true"
        >
          {hasPortraitAvailable(detail.npcId) ? (
            <>
              <img
                src={`/portraits/${detail.npcId.replace('npc-', '')}.jpg`}
                alt=""
                className="npc-portrait-img"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.setProperty('display', 'flex')
                }}
              />
              <PortraitFallback
                npcId={detail.npcId}
                factionId={detail.factionAffinityId}
                nameOverride={detail.name}
                isPrimary={detail.isPrimary}
                style={{ display: 'none' }}
              />
            </>
          ) : (
            <PortraitFallback
              npcId={detail.npcId}
              factionId={detail.factionAffinityId}
              nameOverride={detail.name}
              isPrimary={detail.isPrimary}
            />
          )}
          {detail.hasHouseSeal && <span className="muster-portrait-seal" title="Sworn to the house" />}
        </div>

        <div className="muster-identity">
          <h2>{detail.name}</h2>
          <p className="muster-identity-meta">
            {[detail.sex, detail.ageBand, detail.origin, detail.factionAffinity].filter(Boolean).join(' · ')}
          </p>
          <div className="badge-row">
            <span className="badge">{detail.status}</span>
            <span className="badge">{formatNpcAssignmentLabel(detail.assignment)}</span>
            {detail.activeTitle && (
              <span className="badge badge-positive">
                {contentCatalog.titlesById.get(detail.activeTitle)?.name ?? 'Titled'}
              </span>
            )}
          </div>
          {(wants || needs) && (
            <p className="muster-motivation">
              {wants && <>Wants: {wants}</>}
              {wants && needs && <br />}
              {needs && <>Needs: {needs}</>}
            </p>
          )}
          <div className="muster-action-groups">
            <div className="muster-action-intents">
              {hasTalkOptions && (
                <button
                  className={`action-button ${activeActionMenu === 'talk' ? 'action-button--primary' : 'action-button--secondary'}`}
                  type="button"
                  onClick={() => toggleActionMenu('talk')}
                >
                  Talk
                </button>
              )}
              {hasSpendTimeOptions && (
                <button
                  className={`action-button ${activeActionMenu === 'time' ? 'action-button--primary' : 'action-button--secondary'}`}
                  type="button"
                  onClick={() => toggleActionMenu('time')}
                >
                  Spend Time
                </button>
              )}
            </div>
            {socialPresenceReason && (
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                {socialPresenceReason}
              </p>
            )}
            {activeActionMenu === 'talk' && hasTalkOptions && (
              <section className="muster-action-menu" role="group" aria-label="Talk options">
                <div className="muster-action-row">
                  {dialogueTree && (
                    <button
                      className="action-button action-button--primary"
                      type="button"
                      onClick={handleTalk}
                      disabled={!reachability.canConverseRemotely}
                      title={reachability.canConverseRemotely ? 'Speak with this NPC.' : socialPresenceReason ?? 'Speak is unavailable right now.'}
                    >
                      Speak
                    </button>
                  )}
                  <button
                    className="action-button action-button--secondary"
                    type="button"
                    onClick={() => handleSocialAftermath(() => dispatch(gameActions.deepConversation({ npcId: detail.npcId })))}
                    disabled={!canUsePrivateSocialActions || deepConversationOnCooldown}
                    title={deepConversationTitle}
                  >
                    {deepConversationOnCooldown ? '🔒 Talk Deeply' : 'Talk Deeply'}
                  </button>
                  <button
                    className="action-button action-button--primary"
                    type="button"
                    onClick={() => handleSocialAftermath(() => dispatch(gameActions.courtNpc({ npcId: detail.npcId })))}
                    disabled={!canUsePrivateSocialActions || courtshipOnCooldown}
                    title={courtTitle}
                  >
                    {courtshipOnCooldown ? '🔒 Court' : 'Court'}
                  </button>
                </div>
                {(deepConversationOnCooldown || courtshipOnCooldown) && (
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                    🔒 {deepConversationOnCooldown && courtshipOnCooldown
                      ? 'Already spent private time together today.'
                      : deepConversationOnCooldown
                        ? 'Already had a deep conversation today.'
                        : 'Already courted today.'}{' '}
                    Available again: tomorrow morning.
                  </p>
                )}
                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  {canUsePrivateSocialActions
                    ? 'Talk Deeply and Court do not consume time slots.'
                    : reachability.canConverseRemotely
                      ? 'Speak still works from here. Deeper talk and courtship require meeting in person.'
                      : 'No conversation is possible right now.'}
                </p>
              </section>
            )}
            {activeActionMenu === 'time' && hasSpendTimeOptions && (
              <section className="muster-action-menu" role="group" aria-label="Spend Time options">
                <div className="muster-action-row">
                  <button
                    className="action-button action-button--secondary"
                    type="button"
                    onClick={() => setShowGiftList((value) => !value)}
                    disabled={!canOfferGift || giftItems.length === 0}
                    title={giftUnavailableReason ?? 'Offer a gift from inventory'}
                  >
                    {showGiftList ? 'Hide Gifts' : 'Offer Gift'}
                  </button>
                  <button
                    className="action-button action-button--ghost"
                    type="button"
                    onClick={() => setShowDateProposalModal(true)}
                    disabled={!canUsePrivateSocialActions || intimacyStage === 'none'}
                    title={proposeDateTitle}
                  >
                    Propose Date
                  </button>
                  <button
                    className="action-button action-button--primary"
                    type="button"
                    onClick={() => setShowIntimacyModal(true)}
                    disabled={!canUsePrivateSocialActions || intimacyStage === 'none'}
                    title={spendNightTitle}
                  >
                    Spend Night Together
                  </button>
                </div>
                {giftUnavailableReason && (
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                    {giftUnavailableReason}
                  </p>
                )}
                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  Date-specific costs and duration are shown in the proposal list.
                </p>
                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  Consent and final options are confirmed in the next step.
                </p>
              </section>
            )}
            <div className="muster-action-tools">
              <TitlePanel detail={detail} />
            </div>
          </div>
          {hasNewTopics && dialogueTree && (
            <p className="npc-new-topic-hint">Something on your mind worth raising.</p>
          )}
          {showGiftList && canOfferGift && (
            <div className="title-list">
              {giftItems.length === 0 ? (
                <p className="text-muted">No gift items in inventory.</p>
              ) : (
                giftItems.map((gift) => (
                  <button
                    key={gift.instanceId}
                    className="title-option"
                    type="button"
                    onClick={() => {
                      dispatch(gameActions.giveItemToNpc({ instanceId: gift.instanceId, npcId: detail.npcId }))
                      setShowGiftList(false)
                    }}
                  >
                    <strong>{gift.itemName}</strong>
                    <span className="text-muted"> — Offer to {detail.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      <CharacterSection detail={detail} />

      <div className="npc-tab-bar" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-keyshortcuts={`Control+${TAB_SHORTCUT_KEYS[tab]}`}
            title={`${tab} (Ctrl+${TAB_SHORTCUT_KEYS[tab]})`}
            className={activeTab === tab ? 'npc-tab npc-tab-active' : 'npc-tab'}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
            {tab === 'States' && hasCriticalState && (
              <span className="npc-tab-badge badge-warning" title="A stat is in critical range" aria-label="Warning: critical stat">
                ⚠
              </span>
            )}
            {tab === 'Relations' && hasNewTopics && (
              <span className="npc-tab-badge badge-positive" title="New dialogue topics available" aria-label="New dialogue topics available">
                🔔
              </span>
            )}
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
            const warn = isNpcStateCritical(key, val)
            const negativePolarity = ['fatigue', 'stress', 'hunger', 'fear', 'anger', 'intoxication'].includes(key)
            return (
              <StateStatRow
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={val}
                warn={warn}
                negativePolarity={negativePolarity}
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
            {giftHistory.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Received Gifts</h4>
                <div className="associates-list">
                  {giftHistory.slice(0, 3).map((entry) => (
                    <div key={`${entry.itemId}-${entry.day}`} className="associate-entry">
                      <strong className="associate-name">Received: {entry.itemName}</strong>
                      <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        Day {entry.day} · {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {courtshipHistory.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Courtship History</h4>
                <div className="associates-list">
                  {courtshipHistory.slice(0, 3).map((entry) => (
                    <div key={`${entry.day}-${entry.message}`} className="associate-entry">
                      <strong className="associate-name">Day {entry.day}</strong>
                      <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {deepConversationHistory.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deep Conversation History</h4>
                <div className="associates-list">
                  {deepConversationHistory.slice(0, 3).map((entry) => (
                    <div key={`${entry.day}-${entry.message}`} className="associate-entry">
                      <strong className="associate-name">Day {entry.day}</strong>
                      <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      <DutySection detail={detail} />
      <BondStatusSection detail={detail} />
      <CaptivitySection detail={detail} />
      <EquipmentSection detail={detail} onOpenSlot={setEquipSlot} />
      <PersonalEffectsSection detail={detail} />
      {equipSlot && (
        <ItemSelectionModal
          npcId={detail.npcId}
          slot={equipSlot}
          onClose={() => setEquipSlot(null)}
        />
      )}
      {showIntimacyModal && (
        <IntimacyOptionsModal
          npcName={detail.name}
          requiresConsent={detail.requiresExplicitConsent}
          onConfirm={(options) => {
            // Map boolean contraception to item ID (simplified - in future, select specific item)
            const contraceptionItemId = options.contraception ? 'item-contraceptive-tonic' : null
            dispatch(
              gameActions.engagePhysicalIntimacy({
                npcId: detail.npcId,
                contraceptionItemId,
                intent: options.intent
              }),
            )
            setShowIntimacyModal(false)
          }}
          onCancel={() => setShowIntimacyModal(false)}
        />
      )}
      {showDateProposalModal && (
        <DateProposalModal
          npcId={detail.npcId}
          npcName={detail.name}
          onClose={() => setShowDateProposalModal(false)}
        />
      )}
    </div>
  )
}
