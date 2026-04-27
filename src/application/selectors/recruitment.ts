import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export function selectAvailableForHire(state: RootState) {
  return state.game.availableForHire.map((offer) => {
    const def = contentCatalog.npcsById.get(offer.npcId)
    const faction = def?.factionAffinityId
      ? contentCatalog.factionsById.get(def.factionAffinityId)?.name ?? null
      : null
    return {
      npcId: offer.npcId,
      name: def?.name ?? offer.npcId,
      factionAffinity: faction,
      background: def?.background ?? '',
      wagePerDay: offer.wagePerDay,
      signingBonus: offer.signingBonus,
      turnsAvailable: offer.turnsAvailable,
      requiredFactionId: offer.requiredFactionId,
      requiredFactionStanding: offer.requiredFactionStanding,
    }
  })
}

export function selectCanAffordSigningBonus(state: RootState, npcId: string): boolean {
  const offer = state.game.availableForHire.find((o) => o.npcId === npcId)
  if (!offer) return false
  return state.game.money >= offer.signingBonus
}
