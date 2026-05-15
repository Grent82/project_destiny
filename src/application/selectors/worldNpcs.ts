import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { WorldNpcRuntimeState, WorldNpcDisposition } from '../../domain/npc/contracts'
import type { RelationshipAxes, SoftBondState } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

/** Raw worldNpcStates array from game state */
export const selectWorldNpcStates = (state: RootState): WorldNpcRuntimeState[] =>
  state.game.worldNpcStates

/** Look up a single world NPC runtime state by id, or null if never encountered */
export const selectWorldNpcState =
  (npcId: string) =>
  (state: RootState): WorldNpcRuntimeState | null =>
    state.game.worldNpcStates.find((s) => s.npcId === npcId) ?? null

/** Returns a merged view of static definition + runtime state for a world NPC.
 *  location: locationOverride takes priority over authored schedule slot. */
export interface WorldNpcView {
  npcId: string
  name: string
  background: string
  disposition: WorldNpcDisposition
  lastContactDay: number | null
  currentLocationId: string | null
  flags: string[]
}

export const selectWorldNpcView =
  (npcId: string, timeSlot: 'morning' | 'afternoon' | 'evening' | 'night') =>
  (state: RootState): WorldNpcView | null => {
    const def = contentCatalog.npcsById.get(npcId)
    if (!def || (def.npcType !== 'world' && def.npcType !== 'story')) return null
    const runtime = state.game.worldNpcStates.find((s) => s.npcId === npcId)
    const scheduled = def.schedule[timeSlot] ?? null
    const currentLocationId = runtime?.locationOverride ?? scheduled
    return {
      npcId: def.id,
      name: def.name,
      background: def.background,
      disposition: runtime?.disposition ?? 'neutral',
      lastContactDay: runtime?.lastContactDay ?? null,
      currentLocationId,
      flags: runtime?.flags ?? [],
    }
  }

/** Select all world NPC views for a given district and time slot */
export const selectWorldNpcViewsByDistrict = createSelector(
  [
    (state: RootState) => state.game.worldNpcStates,
    (_state: RootState, districtId: string) => districtId,
    (_state: RootState, _districtId: string, timeSlot: string) => timeSlot,
  ],
  (worldNpcStates, districtId, timeSlot) => {
    const slot = timeSlot as 'morning' | 'afternoon' | 'evening' | 'night'
    return contentCatalog.npcs
      .filter((def) => def.npcType === 'world' || def.npcType === 'story')
      .filter((def) => {
        const runtime = worldNpcStates.find((s) => s.npcId === def.id)
        const locationId = runtime?.locationOverride ?? def.schedule[slot] ?? null
        if (!locationId) return false
        const poi = contentCatalog.poisById.get(locationId)
        return poi?.districtId === districtId
      })
      .map((def) => {
        const runtime = worldNpcStates.find((s) => s.npcId === def.id)
        const locationId = runtime?.locationOverride ?? def.schedule[slot] ?? null
        return {
          npcId: def.id,
          name: def.name,
          background: def.background,
          disposition: (runtime?.disposition ?? 'neutral') as WorldNpcDisposition,
          lastContactDay: runtime?.lastContactDay ?? null,
          currentLocationId: locationId,
          flags: runtime?.flags ?? [],
        } satisfies WorldNpcView
      })
  }
)

export interface NpcBondView {
  fromNpcId: string
  toNpcId: string
  fromName: string
  toName: string
  bondType: string | null
  softBond: SoftBondState
  axes: RelationshipAxes
}

function buildNpcBondView(key: string, axes: RelationshipAxes): NpcBondView | null {
  if (!axes.softBond) return null
  const [fromNpcId, toNpcId] = key.split('→')
  if (!fromNpcId || !toNpcId) return null
  const from = contentCatalog.npcsById.get(fromNpcId)
  const to = contentCatalog.npcsById.get(toNpcId)
  if (!from || !to) return null

  return {
    fromNpcId,
    toNpcId,
    fromName: from.name,
    toName: to.name,
    bondType: axes.bondType ?? null,
    softBond: axes.softBond,
    axes,
  }
}

export const selectNpcBonds =
  (npcId: string) =>
  createSelector(
    (state: RootState) => state.game.relationships,
    (relationships) =>
      Object.entries(relationships)
        .filter(([key, axes]) => key.startsWith(`${npcId}→`) && Boolean(axes.softBond))
        .map(([key, axes]) => buildNpcBondView(key, axes))
        .filter((entry): entry is NpcBondView => entry !== null),
  )

export const selectDiscoverableBonds = createSelector(
  (state: RootState) => state.game.relationships,
  (relationships) =>
    Object.entries(relationships)
      .filter(([, axes]) => Boolean(axes.softBond) && axes.softBond!.visibility !== 'hidden')
      .map(([key, axes]) => buildNpcBondView(key, axes))
      .filter((entry): entry is NpcBondView => entry !== null),
)
