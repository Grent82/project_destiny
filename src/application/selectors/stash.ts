/**
 * @deprecated This file is deprecated. Use selectors from `./household.ts` instead.
 * The legacy `stash` field has been replaced by canonical inventory containers.
 *
 * For weapons/armors in house storage, use:
 * - `selectHouseStorageItems` from ./household
 * - Filter by item category (weapon/armor) as needed
 */

import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { selectHouseStorageItems } from './household'
import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'

const selectGame = (state: RootState) => state.game

/**
 * @deprecated Use selectHouseStorageItems from ./household instead.
 * This selector is kept for backward compatibility during migration.
 */
export const selectStash = createSelector([selectGame], (game) => game.stash)

/**
 * @deprecated Use selectHouseStorageItems from ./household and filter by category.
 * This selector is kept for backward compatibility during migration.
 */
export const selectStashedWeapons = createSelector([selectHouseStorageItems], (houseStorageItems) => {
  const weaponInstanceIds = new Set(
    houseStorageItems
      .filter((item) => {
        const def = rawWeapons.find((w) => w.id === item.itemId)
        return def !== undefined
      })
      .map((item) => item.instanceId)
  )

  return houseStorageItems
    .filter((item) => weaponInstanceIds.has(item.instanceId))
    .map((instance) => {
      const def = rawWeapons.find((w) => w.id === instance.itemId)!
      return {
        ...def,
        instanceId: instance.instanceId,
      }
    })
})

/**
 * @deprecated Use selectHouseStorageItems from ./household and filter by category.
 * This selector is kept for backward compatibility during migration.
 */
export const selectStashedArmors = createSelector([selectHouseStorageItems], (houseStorageItems) => {
  const armorInstanceIds = new Set(
    houseStorageItems
      .filter((item) => {
        const def = rawArmor.find((a) => a.id === item.itemId)
        return def !== undefined
      })
      .map((item) => item.instanceId)
  )

  return houseStorageItems
    .filter((item) => armorInstanceIds.has(item.instanceId))
    .map((instance) => {
      const def = rawArmor.find((a) => a.id === instance.itemId)!
      return {
        ...def,
        instanceId: instance.instanceId,
      }
    })
})
