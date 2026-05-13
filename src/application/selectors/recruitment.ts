import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import enemyNpcsData from '../../../data/definitions/enemy-npcs.json'

type EnemyNpcDef = { id: string; name: string; background: string; factionAffinityId?: string }
const enemyNpcsById = new Map<string, EnemyNpcDef>(
  (enemyNpcsData as EnemyNpcDef[]).map((e) => [e.id, e]),
)

export const selectAvailableForHire = createSelector(
  (state: RootState) => state.game.availableForHire,
  (state: RootState) => state.game.institutionalStanding,
  (availableForHire, institutionalStanding) =>
    availableForHire
      .map((offer) => {
        const def = contentCatalog.npcsById.get(offer.npcId) ?? enemyNpcsById.get(offer.npcId)
        const faction = def?.factionAffinityId
          ? contentCatalog.factionsById.get(def.factionAffinityId)?.name ?? null
          : null
        const factionId = def?.factionAffinityId ?? null
        const institutionalBlock = factionId
          ? (institutionalStanding[factionId] === 'blacklisted' || institutionalStanding[factionId] === 'hostile')
          : false
        return {
          npcId: offer.npcId,
          name: def?.name ?? offer.npcId,
          factionAffinity: faction,
          factionAffinityId: factionId,
          background: def?.background ?? '',
          wagePerDay: offer.wagePerDay,
          signingBonus: offer.signingBonus,
          turnsAvailable: offer.turnsAvailable,
          requiredFactionId: offer.requiredFactionId,
          requiredFactionStanding: offer.requiredFactionStanding,
          source: offer.source,
          institutionalBlock,
          discoveredInDistrictId: offer.discoveredInDistrictId,
          discoveredInDistrictName: offer.discoveredInDistrictId
            ? contentCatalog.districtsById.get(offer.discoveredInDistrictId)?.name ?? offer.discoveredInDistrictId
            : null,
        }
      })
      .filter((o) => !o.institutionalBlock),
)

export function selectCanAffordSigningBonus(state: RootState, npcId: string): boolean {
  const offer = state.game.availableForHire.find((o) => o.npcId === npcId)
  if (!offer) return false
  return state.game.money >= offer.signingBonus
}
