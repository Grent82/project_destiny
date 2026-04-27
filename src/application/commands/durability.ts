import type { GameState } from '../../domain/game/contracts'

export function getDurabilityForNpc(
  state: GameState,
  npcId: string,
  slot: 'weapon' | 'armor',
): number {
  return state.equippedItemDurabilities[npcId]?.[slot] ?? 100
}

export function getDurabilityTier(durability: number): 'good' | 'worn' | 'damaged' | 'broken' {
  if (durability > 50) return 'good'
  if (durability > 20) return 'worn'
  if (durability > 0) return 'damaged'
  return 'broken'
}

export function getDurabilityAccuracyModifier(durability: number): number {
  const tier = getDurabilityTier(durability)
  if (tier === 'good') return 1.0
  if (tier === 'worn') return 0.9
  if (tier === 'damaged') return 0.75
  return 0
}

export function getDurabilityArmorModifier(durability: number): number {
  const tier = getDurabilityTier(durability)
  if (tier === 'good') return 1.0
  if (tier === 'worn') return 0.9
  if (tier === 'damaged') return 0.75
  return 0
}

export function degradeDurability(current: number, amount: number): number {
  return Math.max(0, current - amount)
}
