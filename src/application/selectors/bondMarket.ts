import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

const selectGame = (state: RootState) => state.game

export const selectBondedPersonsRegistry = createSelector(
  [selectGame],
  (game) => game.bondedPersonsRegistry ?? {},
)

export const selectNpcHeldBondedPersons = createSelector(
  [selectGame],
  (game) => {
    const registry = game.bondedPersonsRegistry ?? {}
    return game.roster
      .filter((npc) => npc.assignment === 'transferred' && npc.bondStatus?.ownerType === 'npc')
      .map((npc) => {
        const buyer = npc.bondStatus ? contentCatalog.bondBuyersById.get(npc.bondStatus.holderId) : undefined
        return {
          npc,
          buyerId: npc.bondStatus?.holderId ?? null,
          buyerName: buyer?.name ?? 'Unknown',
          registryEntry: Object.entries(registry).find(([, ids]) => ids.includes(npc.npcId)),
          ransomCost: Math.ceil((npc.bondStatus?.marketValue ?? 0) * 1.5),
        }
      })
  },
)

export const selectForSaleNpcs = createSelector(
  [selectGame],
  (game) =>
    game.roster.filter(
      (npc) => npc.bondStatus?.forSale === true && npc.bondStatus.ownerType === 'player',
    ),
)
