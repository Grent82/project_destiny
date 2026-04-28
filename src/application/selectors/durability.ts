import { getDurabilityTier } from '../commands/durability'
import type { RootState } from '../store/gameStore'

export const selectDurabilityTierForNpc =
  (npcId: string, slot: 'weapon' | 'armor') =>
  (state: RootState): 'good' | 'worn' | 'damaged' | 'broken' => {
    const durability = state.game.equippedItemDurabilities?.[npcId]?.[slot] ?? 100
    return getDurabilityTier(durability)
  }
