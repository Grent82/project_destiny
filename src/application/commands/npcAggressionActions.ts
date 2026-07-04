import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { ItemDefinition } from '../../domain/items/contracts'
import type { Rng } from './seededRng'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { getRelationship, buildRelationshipKey } from '../../domain/relationships/contracts'
import { getNpcRecoverySupport } from './recovery'

/**
 * NPC Aggression & Defense Actions (destiny-kuw0)
 *
 * Real implementations for confront-rival, assert-dominance, protect-house, patrol-district,
 * fortify-position, and care-for-injured.
 */

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampAxis(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)))
}

function updateNpcStates(
  state: GameState,
  npcId: string,
  updates: Partial<NpcRuntimeState['states']>,
): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...updates } } : n)),
  }
}

/**
 * NPC confronts an authored rival, if that rival is a live roster NPC. No-ops if the NPC has no
 * rival authored (npcs.json loyalties) or that rival isn't currently in the roster.
 */
export function npcConfrontRival(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const rivalLoyalty = contentCatalog.npcsById.get(npcId)?.loyalties.find((l) => l.type === 'rival')
  if (!rivalLoyalty) return state
  const target = state.roster.find((n) => n.npcId === rivalLoyalty.targetId)
  if (!target) return state

  const successChance = Math.max(
    0.05,
    Math.min(
      0.95,
      0.4 +
        (npc.attributes.might - 50) / 200 +
        (npc.skills.melee - 50) / 200 +
        (npc.traits.ruthlessness - 50) / 200 -
        (target.attributes.endurance - 50) / 300,
    ),
  )

  let next = state
  if (rng() < successChance) {
    next = updateNpcStates(next, target.npcId, {
      fear: clampPercent(target.states.fear + 12),
      anger: clampPercent(target.states.anger + 8),
    })
    next = appendActivityLogEntry(next, 'system', `${npc.name} confronts their rival ${target.name}, leaving them shaken.`)
  } else {
    next = updateNpcStates(next, npcId, { fear: clampPercent(npc.states.fear + 5) })
    next = appendActivityLogEntry(next, 'system', `${npc.name} confronts ${target.name}, but comes off worse for it.`)
  }

  return next
}

/**
 * NPC asserts dominance over the weakest-willed idle roster NPC available, shifting the target's
 * relationship toward them (more fear, less genuine respect) on success.
 */
export function npcAssertDominance(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = state.roster
    .filter((r) => r.npcId !== npcId && r.assignment === 'idle')
    .sort((a, b) => a.traits.dominance - b.traits.dominance)[0]
  if (!target) return state

  const successChance = Math.max(
    0.05,
    Math.min(
      0.95,
      0.5 +
        (npc.traits.dominance - 50) / 200 +
        (npc.attributes.presence - 50) / 200 -
        (target.traits.dominance - 50) / 200,
    ),
  )

  let next = state
  if (rng() < successChance) {
    const key = buildRelationshipKey(target.npcId, npcId)
    const rel = getRelationship(state.relationships, target.npcId, npcId)
    next = {
      ...next,
      relationships: {
        ...next.relationships,
        [key]: { ...rel, fear: clampAxis(rel.fear + 10), respect: clampAxis(rel.respect - 3) },
      },
    }
    next = appendActivityLogEntry(next, 'system', `${npc.name} asserts dominance over ${target.name}.`)
  } else {
    next = updateNpcStates(next, npcId, { anger: clampPercent(npc.states.anger + 5) })
    next = appendActivityLogEntry(next, 'system', `${npc.name} tries to assert dominance over ${target.name}, and is rebuffed.`)
  }

  return next
}

/**
 * NPC patrols the house grounds, easing tension in the house's own district.
 */
export function npcProtectHouse(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const districtId = state.houseDistrictId
  const reduction = Math.max(
    1,
    Math.min(4, 1 + Math.round((npc.traits.discipline - 50) / 25 + (npc.traits.loyalty - 50) / 25)),
  )
  const currentTension = state.districtTension[districtId] ?? 0

  let next: GameState = {
    ...state,
    districtTension: { ...state.districtTension, [districtId]: Math.max(0, currentTension - reduction) },
  }
  next = updateNpcStates(next, npcId, { morale: clampPercent(npc.states.morale + 3) })
  return appendActivityLogEntry(next, 'system', `${npc.name} patrols the grounds of the house.`)
}

/**
 * NPC patrols their assigned district, easing its tension. No-ops if not assigned anywhere.
 */
export function npcPatrolDistrict(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || !npc.assignedDistrictId) return state

  const districtId = npc.assignedDistrictId
  const reduction = Math.max(
    1,
    Math.min(
      6,
      2 +
        Math.round(
          (npc.attributes.endurance - 50) / 20 + (npc.skills.survival - 50) / 20 + (npc.attributes.perception - 50) / 20,
        ),
    ),
  )
  const currentTension = state.districtTension[districtId] ?? 0

  const next: GameState = {
    ...state,
    districtTension: { ...state.districtTension, [districtId]: Math.max(0, currentTension - reduction) },
  }

  const noticedSomething = rng() < 0.15
  const message = noticedSomething
    ? `${npc.name} patrols ${districtId}, and notices something worth watching.`
    : `${npc.name} patrols ${districtId}.`
  return appendActivityLogEntry(next, 'system', message)
}

const FORTIFY_COST = 20

/**
 * NPC attempts to improve the house's fortification level (security/engineering skill-gated,
 * material cost deducted from house funds). No-ops if funds are short or the level is maxed.
 */
export function npcFortifyPosition(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (state.house.fortificationLevel >= 5) return state
  if (state.money < FORTIFY_COST) return state

  const successChance = Math.max(
    0.1,
    Math.min(0.9, 0.3 + (npc.skills.security - 50) / 150 + (npc.skills.engineering - 50) / 150),
  )

  const success = rng() < successChance
  let next: GameState = {
    ...state,
    money: state.money - (success ? FORTIFY_COST : Math.round(FORTIFY_COST / 2)),
  }

  if (success) {
    next = {
      ...next,
      house: { ...next.house, fortificationLevel: Math.min(5, next.house.fortificationLevel + 1) },
    }
    return appendActivityLogEntry(
      next,
      'system',
      `${npc.name} reinforces the house's defenses. Fortification improved to level ${next.house.fortificationLevel}.`,
    )
  }

  return appendActivityLogEntry(next, 'system', `${npc.name} attempts to reinforce the house's defenses, but the work falls short.`)
}

/**
 * NPC cares for the most injured other idle/recovering roster NPC. Prefers a personal
 * healing-tagged item (consumed); falls back to bedside comfort with a smaller effect.
 */
export function npcCareForInjured(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = state.roster
    .filter((r) => r.npcId !== npcId && (r.assignment === 'idle' || r.assignment === 'recovering'))
    .filter((r) => r.states.injury > 0 || r.states.health < 80)
    .sort((a, b) => b.states.injury - a.states.injury)[0]
  if (!target) return state

  // Per the canonical recovery contract (destiny-i8nc/destiny-o8mn): generic heal effects restore
  // health only. Injury only meaningfully reduces with real treatment support (infirmary/medic),
  // not from a medkit's generic heal effect — matching how useItem.ts's consumable path already
  // treats 'heal' (health-only) and how applyStateDecay.ts's recovering-NPC loop gates injury
  // reduction on getNpcRecoverySupport's tier.
  const supportTier = getNpcRecoverySupport(state, target)
  const injuryReduction = supportTier === 'treatment-plus-medic' ? 8 : supportTier === 'treatment' ? 5 : 0

  const found = findNpcInventoryItemByTag(state, npcId, 'healing')
  if (found) {
    const healEffect = found.itemDef.typedEffects.find((e) => e.type === 'heal')
    const healValue = healEffect && healEffect.type === 'heal' ? healEffect.value : 25
    const skillBonus = npc.skills.medicine >= 60 ? 5 : 0
    let next = consumeNpcInventoryItem(state, npcId, found)
    next = updateNpcStates(next, target.npcId, {
      health: clampPercent(target.states.health + healValue + skillBonus),
      injury: clampPercent(target.states.injury - injuryReduction),
    })
    return appendActivityLogEntry(next, 'system', `${npc.name} treats ${target.name}'s injuries with ${found.itemDef.name}.`)
  }

  const empathyBonus = npc.traits.empathy >= 50 ? 2 : 0
  const next = updateNpcStates(state, target.npcId, {
    health: clampPercent(target.states.health + 5 + empathyBonus),
    injury: clampPercent(target.states.injury - injuryReduction),
  })
  return appendActivityLogEntry(next, 'system', `${npc.name} tends to ${target.name} at their bedside.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared inventory helpers (mirrors npcSurvivalActions.ts's pattern)
// ─────────────────────────────────────────────────────────────────────────────

interface FoundInventoryItem {
  containerIndex: number
  slotIndex: number
  itemInstanceId: string
  itemDef: ItemDefinition
}

function findNpcInventoryItemByTag(state: GameState, npcId: string, tag: string): FoundInventoryItem | null {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  for (const [containerIndex, container] of containers.entries()) {
    for (const [slotIndex, slot] of container.slots.entries()) {
      if (!slot.itemInstanceId) continue
      const instance = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (!instance) continue
      const itemDef = contentCatalog.itemsById.get(instance.itemId)
      if (itemDef?.tags.includes(tag)) {
        return { containerIndex, slotIndex, itemInstanceId: slot.itemInstanceId, itemDef }
      }
    }
  }
  return null
}

function consumeNpcInventoryItem(
  state: GameState,
  npcId: string,
  found: { containerIndex: number; slotIndex: number; itemInstanceId: string },
): GameState {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  const container = containers[found.containerIndex]
  if (!container) return state
  const slot = container.slots[found.slotIndex]
  if (!slot?.itemInstanceId) return state

  const newSlots = [...container.slots]
  const stillStacked = slot.quantity > 1
  if (stillStacked) {
    newSlots[found.slotIndex] = { ...slot, quantity: slot.quantity - 1 }
  } else {
    newSlots.splice(found.slotIndex, 1)
  }
  const newContainers = containers.map((c, i) => (i === found.containerIndex ? { ...c, slots: newSlots } : c))

  const newRegistry = { ...state.inventoryState.itemRegistry }
  if (!stillStacked) delete newRegistry[found.itemInstanceId]

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: newContainers },
      itemRegistry: newRegistry,
    },
  }
}
