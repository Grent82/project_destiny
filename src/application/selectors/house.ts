import { createSelector } from '@reduxjs/toolkit'

import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import type { RootState } from '../store/gameStore'
import type { GameState, Heir, HeirLegitimacy, HouseExteriorTier } from '../../domain'

const selectGame = (state: RootState) => state.game

/** @deprecated Use selectOwnedItemsByLocation. Kept for backward compat. */
export const selectStash = createSelector([selectGame], (game) => game.stash)

/** Helper to get items from house_storage container */
function getHouseStorageItemIds(inventoryState: GameState['inventoryState']): Set<string> {
  const ids = new Set<string>()
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'house_storage') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            ids.add(instanceDef.itemId)
          }
        }
      }
    }
  }
  return ids
}

export const selectStashedWeapons = createSelector([selectGame], (game) => {
  const stashedIds = getHouseStorageItemIds(game.inventoryState)
  return (rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number }>)
    .filter((w) => stashedIds.has(w.id))
})

export const selectStashedArmors = createSelector([selectGame], (game) => {
  const stashedIds = getHouseStorageItemIds(game.inventoryState)
  return (rawArmor as Array<{ id: string; name: string; armorClass: string; soak: number; evasionPenalty: number; tier: number }>)
    .filter((a) => stashedIds.has(a.id))
})

export const selectOwnedItemsByLocation = createSelector([selectGame], (game) => {
  const inventoryState = game.inventoryState

  // Helper to get itemIds from player bag
  const getPlayerItemIds = (): string[] => {
    const ids: string[] = []
    for (const container of inventoryState.player.bagContainers) {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            ids.push(instanceDef.itemId)
          }
        }
      }
    }
    return ids
  }

  // Helper to get itemIds from house_storage
  const getHouseStorageItemIds = (): string[] => {
    const ids: string[] = []
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'house_storage') {
        for (const slot of container.slots) {
          if (slot.itemInstanceId) {
            const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
            if (instanceDef) {
              ids.push(instanceDef.itemId)
            }
          }
        }
      }
    }
    return ids
  }

  // Helper to get itemIds from mission_pack
  const getMissionPackItemIds = (): string[] => {
    const ids: string[] = []
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'mission_pack') {
        for (const slot of container.slots) {
          if (slot.itemInstanceId) {
            const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
            if (instanceDef) {
              ids.push(instanceDef.itemId)
            }
          }
        }
      }
    }
    return ids
  }

  return {
    inventory: getPlayerItemIds(),
    house_storage: getHouseStorageItemIds(),
    equipped: [], // Not yet migrated
    mission_pack: getMissionPackItemIds(),
    archived: [], // Not yet migrated
  }
})

export const selectHouseState = createSelector([selectGame], (game) => game.house)
export const selectLastDomesticRelationshipBeat = createSelector(
  [selectHouseState],
  (house) => house.lastDomesticRelationshipBeat,
)

/** All recognized succession heirs for the house. */
export const selectHouseHeirs = createSelector([selectGame], (game): Heir[] => game.house.houseHeirs)

export const selectHouseRooms = createSelector([selectGame], (game) => game.house.rooms)

export const selectAssignableHouseRooms = createSelector([selectGame], (game) =>
  game.house.rooms
    .filter((room) => room.state === 'intact')
    .map((room) => ({ roomId: room.roomId, name: room.name })),
)

export const selectHouseRoomOccupancy = createSelector([selectGame], (game) =>
  game.house.rooms.map((room) => ({
    roomId: room.roomId,
    occupants: game.roster
      .filter((npc) => npc.roomAssignment === room.roomId)
      .map((npc) => ({ npcId: npc.npcId, name: npc.name, assignment: npc.assignment })),
  })),
)

export const selectHouseRepairSummary = createSelector([selectGame], (game) => {
  const rooms = game.house.rooms
  const totalRepairCost = rooms.reduce((sum, r) => sum + r.repairCost, 0)
  const damagedCount = rooms.filter(
    (r) => r.state === 'damaged' || r.state === 'stripped' || r.state === 'collapsed',
  ).length
  const intactCount = rooms.filter((r) => r.state === 'intact').length
  const canAffordAny = rooms.some(
    (r) => r.repairCost > 0 && r.repairCost <= game.money,
  )
  return { totalRepairCost, damagedCount, intactCount, canAffordAny, vaultUnlocked: game.house.vaultUnlocked }
})

/** Thresholds for computing exterior tier from room state.
 *  Rooms with 'intact' state count toward the threshold.
 *  Rooms with an assigned function additionally count as +0.5 weight. */
const EXTERIOR_THRESHOLDS: Array<{ tier: HouseExteriorTier; minIntact: number; minWithFunctions: number }> = [
  { tier: 'grand',      minIntact: 7, minWithFunctions: 3 },
  { tier: 'restored',   minIntact: 5, minWithFunctions: 2 },
  { tier: 'maintained', minIntact: 3, minWithFunctions: 1 },
  { tier: 'patched',    minIntact: 2, minWithFunctions: 0 },
  { tier: 'ruined',     minIntact: 0, minWithFunctions: 0 },
]

/**
 * Derives the exterior tier from room states and assigned functions.
 * This is the authoritative threshold computation — exteriorState in GameState
 * is the committed value; this selector shows what it *should* be.
 */
export const selectComputedExteriorTier = createSelector([selectGame], (game): HouseExteriorTier => {
  const intactCount = game.house.rooms.filter((r) => r.state === 'intact').length
  const withFunctionCount = game.house.rooms.filter(
    (r) => r.state === 'intact' && r.roomFunction !== null
  ).length

  for (const threshold of EXTERIOR_THRESHOLDS) {
    if (intactCount >= threshold.minIntact && withFunctionCount >= threshold.minWithFunctions) {
      return threshold.tier
    }
  }
  return 'ruined'
})

/** Returns the committed exterior tier from GameState. */
export const selectExteriorTier = createSelector(
  [selectGame],
  (game): HouseExteriorTier => game.house.exteriorState
)

/** Returns true if the computed tier is higher than the committed tier.
 *  Used by the tier-advance trigger. */
export const selectExteriorTierAdvanceable = createSelector(
  [selectGame, selectComputedExteriorTier],
  (game, computed): boolean => {
    const TIERS: HouseExteriorTier[] = ['ruined', 'patched', 'maintained', 'restored', 'grand']
    return TIERS.indexOf(computed) > TIERS.indexOf(game.house.exteriorState)
  }
)

/** House prestige tier names */
export type HousePrestigeTier = 'collapsed' | 'occupied' | 'established' | 'recognized' | 'prominent'

export const PRESTIGE_TIER_LABELS: Record<HousePrestigeTier, string> = {
  collapsed: 'Collapsed',
  occupied: 'Occupied',
  established: 'Established',
  recognized: 'Recognized',
  prominent: 'Prominent',
}

/** Minimum prestige score for each tier (sourced from gameRules). */
const PRESTIGE_TIER_THRESHOLDS: Array<{ tier: HousePrestigeTier; min: number }> = [
  { tier: 'prominent',   min: 80 },
  { tier: 'recognized',  min: 60 },
  { tier: 'established', min: 40 },
  { tier: 'occupied',    min: 20 },
  { tier: 'collapsed',   min: 0 },
]

function computePrestigeTier(score: number): HousePrestigeTier {
  return PRESTIGE_TIER_THRESHOLDS.find((t) => score >= t.min)?.tier ?? 'collapsed'
}

/**
 * House prestige is a DERIVED metric — never stored, always computed.
 *
 * Score formula:
 *   exteriorState tier value (0–80)
 *   + repaired rooms with assigned functions × 3
 *   + intact rooms (without function) × 1
 *   + installed house modules × 4
 *
 * Max theoretical score: ~120+ (clamped to 100)
 */
export const selectHousePrestige = createSelector([selectGame], (game) => {
  const EXTERIOR_TIER_SCORES: Record<HouseExteriorTier, number> = {
    grand: 80,
    restored: 60,
    maintained: 40,
    patched: 20,
    ruined: 0,
  }
  const exteriorScore = EXTERIOR_TIER_SCORES[game.house.exteriorState]
  const roomsWithFunction = game.house.rooms.filter(
    (r) => r.state === 'intact' && r.roomFunction !== null
  ).length
  const intactOnly = game.house.rooms.filter(
    (r) => r.state === 'intact' && r.roomFunction === null
  ).length
  const moduleScore = game.installedHouseModules.length * 4

  const score = Math.min(100, exteriorScore + roomsWithFunction * 3 + intactOnly * 1 + moduleScore)
  const tier = computePrestigeTier(score)

  return {
    score,
    tier,
    label: PRESTIGE_TIER_LABELS[tier],
    breakdown: {
      exteriorScore,
      roomsWithFunction,
      intactOnly,
      moduleScore,
    },
  }
})

export type ContractTier = 'petty' | 'standard' | 'high_tier' | 'senior'

/**
 * Content gates derived from house prestige tier.
 *
 * collapsed:    no faction contracts, no specialist recruitment
 * occupied:     petty contracts, basic NPCs
 * established:  standard contracts, reputation-sensitive NPCs
 * recognized:   high-tier contracts, social scenes unlocked
 * prominent:    senior guild contacts, full political access
 */
export const selectContentGates = createSelector(selectHousePrestige, (prestige) => {
  const tier = prestige.tier

  const contractsByTier: Record<HousePrestigeTier, ContractTier[]> = {
    collapsed:   [],
    occupied:    ['petty'],
    established: ['petty', 'standard'],
    recognized:  ['petty', 'standard', 'high_tier'],
    prominent:   ['petty', 'standard', 'high_tier', 'senior'],
  }

  return {
    canAccessContracts: contractsByTier[tier],
    socialScenesUnlocked: tier === 'recognized' || tier === 'prominent',
    specialistRecruitUnlocked: tier !== 'collapsed',
    politicalLeverageUnlocked: tier === 'prominent',
    prestigeTier: tier,
    prestigeLabel: PRESTIGE_TIER_LABELS[tier],
  }
})

/**
 * Computes the house defense rating from:
 *  fortificationLevel × hardware weight
 *  + NPCs on 'defense' assignment × crew weight
 *  + renown level × deterrence modifier
 *
 * Higher defenseRating → more likely to deter or repel a raid.
 */
export const selectDefenseRating = createSelector([selectGame], (game): number => {
  const DEFENSE_FORTIFICATION_WEIGHT = 15
  const DEFENSE_GUARD_CREW_WEIGHT = 10
  const DEFENSE_RENOWN_DETERRENCE_PER_LEVEL = 10
  const DEFENSE_RENOWN_LEVEL_DIVISOR = 20

  const fortScore = game.house.fortificationLevel * DEFENSE_FORTIFICATION_WEIGHT
  const guardCount = game.roster.filter((n) => n.assignment === 'defense').length
  const crewScore = guardCount * DEFENSE_GUARD_CREW_WEIGHT

  // Renown level from progression (uses getRenownLevel via prestige)
  const EXTERIOR_TIER_SCORES: Record<HouseExteriorTier, number> = {
    grand: 80,
    restored: 60,
    maintained: 40,
    patched: 20,
    ruined: 0,
  }
  const prestige = EXTERIOR_TIER_SCORES[game.house.exteriorState]
  const renownLevel = Math.floor(prestige / DEFENSE_RENOWN_LEVEL_DIVISOR) // 0–4
  const renownScore = renownLevel * DEFENSE_RENOWN_DETERRENCE_PER_LEVEL

  return fortScore + crewScore + renownScore
})

/**
 * Returns house storage info including base capacity, used slots, and installed modules.
 */
export const selectHouseStorageInfo = createSelector([selectGame], (game) => {
  // Count items in house_storage container
  let usedSlots = 0
  for (const container of game.inventoryState.sharedContainers) {
    if (container.ownerId === 'house_storage') {
      usedSlots += container.slots.filter((slot) => slot.itemInstanceId !== null).length
    }
  }

  return {
    capacity: game.houseStorageCapacity,
    usedSlots,
    available: Math.max(0, game.houseStorageCapacity - usedSlots),
    installedModules: game.installedHouseModules,
  }
})

const LEGITIMACY_WEIGHT: Record<HeirLegitimacy, number> = {
  recognized: 3,
  contested: 1,
  hidden: 0,
  unknown: 0,
}

/** Political weight modifier granted by the house's recognized heirs. */
export const selectHeirLegitimacyWeight = createSelector([selectGame], (game): number => {
  return game.house.houseHeirs.reduce((sum, heir) => {
    const status = heir.legitimacyStatus ?? 'unknown'
    return sum + (LEGITIMACY_WEIGHT[status] ?? 0)
  }, 0)
})
