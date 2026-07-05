import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../../content/equipmentCatalog'
import { computeRepairCost, getDurabilityForNpc } from '../durability'
import { findNpcInventoryItemByTag, consumeNpcInventoryItem } from '../npcInventoryHelpers'
import { createRng } from '../seededRng'

/**
 * NPC self-repair (destiny-bkln, merged 6m5j + owyh — see docs/analysis for the merge
 * rationale). Targets the same repair model houseReducers.repairItem/durability.ts already use
 * (npc.loadout weapon/armor ids + equippedItemDurabilities[npcId][slot]), not the newer
 * instance-based npc.equipment field, to avoid a third parallel NPC-equipment model.
 */

export const DURABILITY_REPAIR_THRESHOLD = 50
const REPAIR_MATERIAL_TAG = 'repair'
const PARTIAL_REPAIR_FRACTION = 0.25

export interface RepairableSlot {
  slot: 'weapon' | 'armor'
  itemId: string
}

function findRepairableSlot(state: GameState, npc: NpcRuntimeState): RepairableSlot | null {
  const weaponId = npc.loadout.primaryWeaponId
  if (weaponId && getDurabilityForNpc(state, npc.npcId, 'weapon') < DURABILITY_REPAIR_THRESHOLD) {
    return { slot: 'weapon', itemId: weaponId }
  }
  const armorId = npc.loadout.armorId
  if (armorId && getDurabilityForNpc(state, npc.npcId, 'armor') < DURABILITY_REPAIR_THRESHOLD) {
    return { slot: 'armor', itemId: armorId }
  }
  return null
}

/** Whether this NPC has equipment eligible for self-repair right now (durability < threshold). */
export function npcNeedsEquipmentRepair(state: GameState, npc: NpcRuntimeState): boolean {
  return findRepairableSlot(state, npc) !== null
}

/** Repair success chance (0-100), scaled by the average of crafting/engineering skill. */
export function repairSuccessChance(npc: NpcRuntimeState): number {
  const skill = (npc.skills.crafting + npc.skills.engineering) / 2
  return Math.min(95, 60 + Math.round(skill / 5))
}

/**
 * NPC repairs their own damaged weapon or armor. Prefers a 'repair'-tagged material item from
 * their own inventory (free); falls back to paying from personalFunds (carriedCash, then
 * savings). No-ops if neither materials nor sufficient funds are available — the NPC simply
 * tries again another day. Success chance (skill-scaled) gates full vs. partial restoration.
 */
export function npcRepairEquipment(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = findRepairableSlot(state, npc)
  if (!target) return state

  const baseCost = target.slot === 'weapon' ? getWeaponRepairCost(target.itemId) : getArmorRepairCost(target.itemId)
  const hasQuartermaster = npc.activeTitle === 'title-quartermaster'
  const cost = computeRepairCost(baseCost, hasQuartermaster)

  const materialFound = findNpcInventoryItemByTag(state, npcId, REPAIR_MATERIAL_TAG)
  let next: GameState = state
  let paymentDescription: string

  if (materialFound) {
    next = consumeNpcInventoryItem(next, npcId, materialFound)
    paymentDescription = `using salvaged ${materialFound.itemDef.name}`
  } else {
    const funds = npc.personalFunds
    const totalAvailable = funds.carriedCash + funds.savings
    if (totalAvailable < cost) return state

    const fromCarried = Math.min(funds.carriedCash, cost)
    const fromSavings = cost - fromCarried
    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              personalFunds: {
                ...n.personalFunds,
                carriedCash: n.personalFunds.carriedCash - fromCarried,
                savings: n.personalFunds.savings - fromSavings,
              },
            }
          : n,
      ),
    }
    paymentDescription = `paying ${cost} marks out of pocket`
  }

  const { rng, getSeed } = createRng(next.rngSeed)
  const succeeded = rng() * 100 < repairSuccessChance(npc)
  const durabilityMax = target.slot === 'weapon' ? getWeaponDurabilityMax(target.itemId) : getArmorDurabilityMax(target.itemId)
  const currentDurability = getDurabilityForNpc(next, npcId, target.slot)
  const newDurability = succeeded
    ? durabilityMax
    : Math.min(durabilityMax, currentDurability + Math.round(durabilityMax * PARTIAL_REPAIR_FRACTION))

  next = {
    ...next,
    rngSeed: getSeed(),
    equippedItemDurabilities: {
      ...next.equippedItemDurabilities,
      [npcId]: { ...next.equippedItemDurabilities[npcId], [target.slot]: newDurability },
    },
  }

  const message = succeeded
    ? `${npc.name} repairs their ${target.slot}, ${paymentDescription}. It's as good as new.`
    : `${npc.name} attempts to repair their ${target.slot}, ${paymentDescription}, but the work is imperfect.`

  return appendActivityLogEntry(next, 'economy', message)
}
