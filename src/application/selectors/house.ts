import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import type { HouseExteriorTier } from '../../domain/game/contracts'

const selectGame = (state: RootState) => state.game

export const selectHouseState = createSelector([selectGame], (game) => game.house)

export const selectHouseRooms = createSelector([selectGame], (game) => game.house.rooms)

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

import { ROOM_FUNCTION_CAPACITY_BONUS } from '../commands/assignRoomFunction'

const BASE_CREW_CAPACITY = 4

export const selectCrewCapacity = createSelector([selectGame], (game) => {
  const functionBonus = game.house.rooms
    .filter((r) => r.state === 'intact' && r.roomFunction !== null)
    .reduce((sum, r) => sum + (ROOM_FUNCTION_CAPACITY_BONUS[r.roomFunction!] ?? 0), 0)

  const total = BASE_CREW_CAPACITY + game.house.rosterBonus + functionBonus
  return {
    base: BASE_CREW_CAPACITY,
    rosterBonus: game.house.rosterBonus,
    functionBonus,
    total,
    filled: game.roster.length,
  }
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

/** House prestige score (0–100), weighted by exterior tier + functional rooms. */
export const selectHousePrestige = createSelector([selectGame], (game): number => {
  const tierScore: Record<HouseExteriorTier, number> = {
    ruined: 0, patched: 10, maintained: 25, restored: 50, grand: 80,
  }
  const base = tierScore[game.house.exteriorState]
  const functionBonus = game.house.rooms.filter(
    (r) => r.state === 'intact' && r.roomFunction !== null
  ).length * 2
  return Math.min(100, base + functionBonus)
})

// Defense constants
const FORTIFICATION_WEIGHT = 15
const GUARD_CREW_WEIGHT = 10
const RENOWN_DETERRENCE_PER_LEVEL = 5

/**
 * Computes the house defense rating from:
 *  fortificationLevel × hardware weight
 *  + NPCs on 'defense' assignment × crew weight
 *  + renown level × deterrence modifier
 *
 * Higher defenseRating → more likely to deter or repel a raid.
 */
export const selectDefenseRating = createSelector([selectGame], (game): number => {
  const fortScore = game.house.fortificationLevel * FORTIFICATION_WEIGHT
  const guardCount = game.roster.filter((n) => n.assignment === 'defense').length
  const crewScore = guardCount * GUARD_CREW_WEIGHT

  // Renown level from progression (uses getRenownLevel via prestige)
  const prestige = (() => {
    const tierScore: Record<HouseExteriorTier, number> = {
      ruined: 0, patched: 10, maintained: 25, restored: 50, grand: 80,
    }
    return tierScore[game.house.exteriorState]
  })()
  const renownLevel = Math.floor(prestige / 20) // 0–4
  const renownScore = renownLevel * RENOWN_DETERRENCE_PER_LEVEL

  return fortScore + crewScore + renownScore
})

/**
 * Returns house storage info including base capacity, used slots, and installed modules.
 *
 * The effective capacity = houseStorageCapacity (base) + storage_expand effects applied at install time.
 * Module expansion is applied directly to houseStorageCapacity when installModule runs — this selector
 * reads the already-updated capacity from state (no catalog lookup needed at read time).
 */
export const selectHouseStorageInfo = createSelector([selectGame], (game) => {
  const usedSlots = game.ownedItems.filter((i) => i.location === 'house_storage').length

  return {
    capacity: game.houseStorageCapacity,
    usedSlots,
    available: Math.max(0, game.houseStorageCapacity - usedSlots),
    installedModules: game.installedHouseModules,
  }
})
