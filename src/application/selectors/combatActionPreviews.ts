/**
 * Player-facing preview data for the four combat action buttons (Attack/Advance/Retreat/Guard) --
 * target, expected damage, hit chance, range consequences, and genuinely wasteful-turn warnings.
 *
 * Deliberately read-only: every number here is computed by calling the exact same pure functions
 * the real resolution path uses (computeAttackAccuracy, computeAttackDamageRange, getPreferredTarget,
 * getRangeModifier from combatResolution.ts), never a re-derived approximation, so the preview can
 * never drift from what actually happens when the button is pressed.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { ActiveCombatState, CombatAction, CombatantState, CombatRange } from '../../domain'
import type { RootState } from '../store/gameStore'
import {
  computeAttackAccuracy,
  computeAttackDamageRange,
  getOpponents,
  getPreferredTarget,
  getRangeModifier,
} from '../commands/combatResolution'

export interface CombatActionPreview {
  id: CombatAction
  /** True when pressing this action right now would consume the turn for no possible benefit. */
  wasteful: boolean
  /** Set only when `wasteful` — the reason to show as the disabled-state explanation. */
  disabledReason: string | null
  /** Small muted line under the button label (e.g. "Auto-target: Enemy Archer (HP 12/18)"). */
  previewLine: string | null
  /** ⚠-prefixed line, or null when there's nothing risk-worthy to flag. */
  riskLine: string | null
  /** Full detail shown on hover. */
  tooltip: string
}

const NO_RNG_NEEDED = () => 0 // getPreferredTarget never calls rng() on the ally branch

const RANGE_LABEL: Record<CombatRange, string> = { close: 'Close', medium: 'Medium', distant: 'Distant' }

// Mirrors advance()/retreat() in combatResolution.ts exactly (distant -> medium -> close and back).
function nextRangeTowardClose(range: CombatRange): CombatRange | null {
  if (range === 'close') return null
  return range === 'distant' ? 'medium' : 'close'
}

function nextRangeTowardDistant(range: CombatRange): CombatRange | null {
  if (range === 'distant') return null
  return range === 'close' ? 'medium' : 'distant'
}

function buildAttackPreview(encounter: ActiveCombatState, actor: CombatantState): CombatActionPreview {
  const target = getPreferredTarget(encounter, actor, NO_RNG_NEEDED)

  if (!target) {
    return {
      id: 'attack',
      wasteful: true,
      disabledReason: 'No living targets remain.',
      previewLine: null,
      riskLine: null,
      tooltip: 'No living targets remain.',
    }
  }

  const accuracy = computeAttackAccuracy(actor, target, encounter.range)
  const { min, max } = computeAttackDamageRange(actor, target)
  const missChance = 100 - accuracy

  const previewLine = `Auto-target: ${target.name} (HP ${target.health}/${target.maxHealth})`
  const expectedLine = `Expected: ${min}-${max} damage · ${accuracy}% hit chance`
  const riskLine = missChance >= 40 ? `⚠ Low hit chance — ${missChance}% chance to miss` : null

  return {
    id: 'attack',
    wasteful: false,
    disabledReason: null,
    previewLine: `${previewLine} — ${expectedLine}`,
    riskLine,
    tooltip: `${previewLine}. ${expectedLine}. Allies always focus the lowest-HP living opponent.`,
  }
}

function buildRangeActionPreview(
  encounter: ActiveCombatState,
  actor: CombatantState,
  id: 'advance' | 'retreat',
): CombatActionPreview {
  const nextRange =
    id === 'advance' ? nextRangeTowardClose(encounter.range) : nextRangeTowardDistant(encounter.range)

  if (!nextRange) {
    const edgeLabel = id === 'advance' ? 'closest' : 'farthest'
    return {
      id,
      wasteful: true,
      disabledReason: `Already at ${edgeLabel} range — this would waste the turn.`,
      previewLine: null,
      riskLine: null,
      tooltip: `Already at ${edgeLabel} range — ${id === 'advance' ? 'advancing' : 'retreating'} would waste the turn without changing anything.`,
    }
  }

  const currentOffset = getRangeModifier(actor.equippedWeaponId, encounter.range)
  const nextOffset = getRangeModifier(actor.equippedWeaponId, nextRange)
  const accuracyDelta = nextOffset - currentOffset

  const enemies = getOpponents(encounter, actor.side)
  const enemiesFavoringNextRange = enemies.filter((enemy) => {
    const enemyCurrent = getRangeModifier(enemy.equippedWeaponId, encounter.range)
    const enemyNext = getRangeModifier(enemy.equippedWeaponId, nextRange)
    return enemyNext > enemyCurrent
  }).length

  const arrow = id === 'advance' ? '→' : '←'
  const previewLine = `${arrow} Move to ${RANGE_LABEL[nextRange]} range`

  const riskParts: string[] = []
  if (accuracyDelta < 0) riskParts.push(`your accuracy drops ${Math.abs(accuracyDelta)}%`)
  if (enemiesFavoringNextRange > 0) {
    riskParts.push(
      `${enemiesFavoringNextRange} ${enemiesFavoringNextRange === 1 ? 'enemy favors' : 'enemies favor'} this range`,
    )
  }
  const riskLine = riskParts.length > 0 ? `⚠ Risk: ${riskParts.join(', ')}` : null

  const benefitLine = accuracyDelta > 0 ? ` Your accuracy improves ${accuracyDelta}% at this range.` : ''

  return {
    id,
    wasteful: false,
    disabledReason: null,
    previewLine,
    riskLine,
    tooltip: `${previewLine}.${benefitLine}${riskLine ? ` ${riskLine.replace('⚠ ', '')}.` : ''}`,
  }
}

function buildGuardPreview(actor: CombatantState): CombatActionPreview {
  if (actor.guardCooldown) {
    return {
      id: 'guard',
      wasteful: true,
      disabledReason: 'Already braced this round — guarding again would waste the turn.',
      previewLine: null,
      riskLine: null,
      tooltip: 'This combatant already braced this round and cannot guard again until the next round.',
    }
  }

  const previewLine = '🛡 −30% damage taken'
  const expirationLine = 'Expires when you act again'

  return {
    id: 'guard',
    wasteful: false,
    disabledReason: null,
    previewLine: `${previewLine} — ${expirationLine}`,
    riskLine: null,
    tooltip: `Braces for the next hit: incoming damage is reduced by 30% until this combatant's next action, at which point the guard drops.`,
  }
}

function buildActionPreviews(
  encounter: ActiveCombatState | null,
  activeCombatantId: string | null,
): CombatActionPreview[] {
  if (!encounter || !activeCombatantId) return []
  const actor = encounter.combatants.find((c) => c.combatantId === activeCombatantId)
  if (!actor || actor.side !== 'allies') return []

  return [
    buildAttackPreview(encounter, actor),
    buildRangeActionPreview(encounter, actor, 'advance'),
    buildRangeActionPreview(encounter, actor, 'retreat'),
    buildGuardPreview(actor),
  ]
}

export const selectCombatActionPreviews = createSelector(
  [(state: RootState) => state.game.activeCombat, (state: RootState) => state.game.activeCombat?.activeCombatantId ?? null],
  (activeCombat, activeCombatantId) => buildActionPreviews(activeCombat, activeCombatantId),
)
