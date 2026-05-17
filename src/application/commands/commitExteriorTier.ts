import type { GameState, HouseExteriorTier } from '../../domain/game/contracts'

/** Ordered thresholds — first matching tier wins. Must match selectComputedExteriorTier in house.ts. */
const EXTERIOR_THRESHOLDS: Array<{ tier: HouseExteriorTier; minIntact: number; minWithFunctions: number }> = [
  { tier: 'grand',      minIntact: 7, minWithFunctions: 3 },
  { tier: 'restored',   minIntact: 5, minWithFunctions: 2 },
  { tier: 'maintained', minIntact: 3, minWithFunctions: 1 },
  { tier: 'patched',    minIntact: 2, minWithFunctions: 0 },
  { tier: 'ruined',     minIntact: 0, minWithFunctions: 0 },
]

/** Compute the exterior tier that should apply given the current room states. */
export function computeExteriorTier(state: GameState): HouseExteriorTier {
  const intactCount = state.house.rooms.filter((r) => r.state === 'intact').length
  const withFunctionCount = state.house.rooms.filter(
    (r) => r.state === 'intact' && r.roomFunction !== null,
  ).length

  for (const threshold of EXTERIOR_THRESHOLDS) {
    if (intactCount >= threshold.minIntact && withFunctionCount >= threshold.minWithFunctions) {
      return threshold.tier
    }
  }
  return 'ruined'
}

/**
 * Commit the exterior tier to GameState if the computed tier differs from the stored one.
 * Returns state unchanged when no advancement is needed.
 */
export function commitExteriorTier(state: GameState): GameState {
  const computed = computeExteriorTier(state)
  if (computed === state.house.exteriorState) return state

  return {
    ...state,
    house: {
      ...state.house,
      exteriorState: computed,
    },
  }
}
