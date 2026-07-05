import { gameStateSchema, type GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { SaveGameStore } from '../../application/ports/saveGameStore'
import { createEmptyChronicle } from '../../domain/chronicle/contracts'
import { normalizePendingEventInstances } from '../../application/commands/eventInstances'
import { createRuntimeStateFromDefinition } from '../../application/commands/createRuntimeStateFromDefinition'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
  }
}

function isStorageLike(value: unknown): value is StorageLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StorageLike).getItem === 'function' &&
    typeof (value as StorageLike).setItem === 'function' &&
    typeof (value as StorageLike).removeItem === 'function'
  )
}

/**
 * v6 → v7 field rename (destiny-rama.7 / unified-npc-runtime-contract §7 step 1): the GameState field
 * `roster` was renamed to `npcRuntimeStates`, and every person gained `npcType` + `playerRosterMember`.
 * Any save written before v7 uses the old `roster` key and lacks those fields, so it would fail the
 * now-strict schema. Rename the key and stamp the fields — every pre-v7 person was a player-roster
 * member (world/captive persons did not yet live in this list). Applied to every version branch below
 * (all of them spread the raw save), and a no-op once the save is already on the new shape.
 */
function migrateRosterFieldToNpcRuntimeStates(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.roster) || record.npcRuntimeStates !== undefined) return raw
  const npcRuntimeStates = (record.roster as unknown[]).map((entry) =>
    entry && typeof entry === 'object'
      ? { npcType: 'roster', playerRosterMember: true, ...(entry as Record<string, unknown>) }
      : entry,
  )
  const rest: Record<string, unknown> = { ...record }
  delete rest.roster
  return { ...rest, npcRuntimeStates }
}

/**
 * v6/v7(pre-C2) → v7(current) fold (destiny-rama.8 / unified-npc-runtime-contract §7 step 2): the
 * separate `worldNpcStates` array is folded into `npcRuntimeStates` via the definition-driven
 * factory (§4.1 field map), then removed. `npcType` deliberately comes from each npc's own
 * definition rather than being stamped 'world' — two of the three shipped runtime entries
 * (npc-enemy-tomas-rell, npc-enemy-catrin-hale) are npcType:'enemy' by definition despite having
 * lived in worldNpcStates (a pre-existing source-of-truth drift tracked separately in
 * destiny-rama.14); stamping them 'world' here would plant a wrong fact into the schema instead of
 * just carrying the drift forward untouched.
 *
 * Guarded on array presence (not saveVersion), matching migrateRosterFieldToNpcRuntimeStates above:
 * a save can already be stamped saveVersion:7 by the C1-era migration alone (which only renamed
 * roster -> npcRuntimeStates before C2 existed, leaving worldNpcStates untouched), so version
 * number alone can't tell us whether the fold has actually happened. A no-op once worldNpcStates is
 * already gone.
 */
function migrateWorldNpcStatesIntoNpcRuntimeStates(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.worldNpcStates)) return raw

  const existingRuntimeStates = Array.isArray(record.npcRuntimeStates)
    ? (record.npcRuntimeStates as Record<string, unknown>[])
    : []
  const existingIds = new Set(existingRuntimeStates.map((entry) => entry?.npcId))

  const hydrated: Record<string, unknown>[] = []
  for (const legacyEntry of record.worldNpcStates as Record<string, unknown>[]) {
    if (!legacyEntry || typeof legacyEntry !== 'object') continue
    const npcId = legacyEntry.npcId as string | undefined
    // Never overwrite or duplicate a person who already has a runtime entry under the new name.
    if (!npcId || existingIds.has(npcId)) continue

    const overrides: Partial<NpcRuntimeState> = {
      playerRosterMember: false,
      worldDisposition: (legacyEntry.disposition as NpcRuntimeState['worldDisposition']) ?? 'neutral',
      lastContactDay: (legacyEntry.lastContactDay as number | null | undefined) ?? null,
      locationOverride: (legacyEntry.locationOverride as string | null | undefined) ?? null,
      assignment: legacyEntry.recovering ? 'recovering' : 'idle',
      states: {
        health: (legacyEntry.health as number | undefined) ?? 100,
        fatigue: 0,
        stress: 0,
        morale: 50,
        fear: 0,
        anger: 0,
        hunger: 0,
        injury: (legacyEntry.injury as number | undefined) ?? 0,
        intoxication: 0,
        hygiene: 70,
      },
    }
    if (Array.isArray(legacyEntry.flags) && legacyEntry.flags.length > 0) {
      overrides.flags = legacyEntry.flags as string[]
    }
    if (legacyEntry.clothing && typeof legacyEntry.clothing === 'object') {
      overrides.clothing = legacyEntry.clothing as NpcRuntimeState['clothing']
    }
    if (legacyEntry.armor && typeof legacyEntry.armor === 'object') {
      overrides.armor = legacyEntry.armor as NpcRuntimeState['armor']
    }
    // Old worldNpcRuntimeStateSchema used `pregnancyState: nullable()`; the new field is
    // `optional()` (no null) — omit entirely rather than pass an explicit null.
    if (legacyEntry.pregnancyState && typeof legacyEntry.pregnancyState === 'object') {
      overrides.pregnancyState = legacyEntry.pregnancyState as NpcRuntimeState['pregnancyState']
    }
    // legacyEntry.intimacyStage is deliberately dropped — verified dead/unread on the old world
    // shape (see destiny-rama.8 closing notes); real intimacy already lives on `state.relationships`.

    try {
      hydrated.push(createRuntimeStateFromDefinition(npcId, overrides) as unknown as Record<string, unknown>)
    } catch (err) {
      // A legacy save referencing a definition that no longer exists — drop this one person rather
      // than fail the whole load (matches the store's existing graceful-degradation contract).
      console.warn(`[SaveStore] Dropping legacy worldNpcStates entry for unknown npc '${npcId}':`, err)
    }
  }

  const rest: Record<string, unknown> = { ...record }
  delete rest.worldNpcStates
  return { ...rest, npcRuntimeStates: [...existingRuntimeStates, ...hydrated] }
}

/**
 * v6/v7(pre-C3) → v7(current) fold (destiny-rama.9 / unified-npc-runtime-contract §7 step 3, §4.2):
 * the separate `npcCaptivityStates` record is folded into the matching person's
 * `npcRuntimeStates[].captivityState`, then removed. `npcType` again comes from each person's own
 * definition (e.g. Mira is npcType:'story') rather than being assumed.
 *
 * Guarded on key presence (not saveVersion), matching the two migrations above — a save can already
 * be stamped saveVersion:7 by an earlier partial migration while still holding
 * `npcCaptivityStates`. A no-op once the key is already gone.
 */
function migrateNpcCaptivityStatesIntoNpcRuntimeStates(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const record = raw as Record<string, unknown>
  if (record.npcCaptivityStates === undefined || record.npcCaptivityStates === null) return raw
  if (typeof record.npcCaptivityStates !== 'object') return raw

  const existingRuntimeStates = Array.isArray(record.npcRuntimeStates)
    ? (record.npcRuntimeStates as Record<string, unknown>[])
    : []

  const nextRuntimeStates = [...existingRuntimeStates]
  for (const [npcId, captivityState] of Object.entries(
    record.npcCaptivityStates as Record<string, unknown>,
  )) {
    const existingIndex = nextRuntimeStates.findIndex((entry) => entry?.npcId === npcId)
    if (existingIndex >= 0) {
      // Already has a runtime entry — set/overwrite captivityState on it, never duplicate.
      nextRuntimeStates[existingIndex] = { ...nextRuntimeStates[existingIndex], captivityState }
      continue
    }

    try {
      nextRuntimeStates.push(
        createRuntimeStateFromDefinition(npcId, {
          playerRosterMember: false,
          captivityState: captivityState as NpcRuntimeState['captivityState'],
        }) as unknown as Record<string, unknown>,
      )
    } catch (err) {
      // A legacy captivity record referencing a definition that no longer exists — drop this one
      // person rather than fail the whole load.
      console.warn(`[SaveStore] Dropping legacy npcCaptivityStates entry for unknown npc '${npcId}':`, err)
    }
  }

  const rest: Record<string, unknown> = { ...record }
  delete rest.npcCaptivityStates
  return { ...rest, npcRuntimeStates: nextRuntimeStates }
}

function migrateState(rawInput: unknown): GameState | null {
  const raw = migrateNpcCaptivityStatesIntoNpcRuntimeStates(
    migrateWorldNpcStatesIntoNpcRuntimeStates(migrateRosterFieldToNpcRuntimeStates(rawInput)),
  )
  const version = (raw as Record<string, unknown>)?.saveVersion ?? 0

  if (version === 0) {
    // v0 → v1: add saveVersion and normalize playerCharacter to attributes/skills/traits shape
    const pc = (raw as Record<string, unknown>)?.playerCharacter as Record<string, unknown> | undefined
    const migrated = {
      ...(raw as object),
      saveVersion: 1,
      playerCharacter: pc?.attributes
        ? pc
        : {
            name: pc?.name ?? 'The Heir',
            attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
            skills: { melee: 30, ranged: 20, medicine: 10, administration: 20, intrigue: 30, negotiation: 20, engineering: 10, academics: 10, performance: 20, survival: 20, security: 20, crafting: 10 },
            traits: { discipline: 40, ambition: 60, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 50, vanity: 40, zeal: 40 },
            level: 1,
            renown: (pc?.renown as number) ?? 0,
          },
    }
    return gameStateSchema.safeParse(migrated).data ?? null
  }

  if (version === 1) {
    // v1 → v2: skip ownedItems migration (legacy system removed)
    const raw1 = raw as Record<string, unknown>
    return gameStateSchema.safeParse({ ...raw1, saveVersion: 2 }).data ?? null
  }

  if (version === 2) {
    // v2 → v3: add chronicle field
    const raw2 = raw as Record<string, unknown>
    return gameStateSchema.safeParse({ ...raw2, saveVersion: 3, chronicle: createEmptyChronicle() }).data ?? null
  }

  if (version === 3) {
    // v3 → v4: add foodStock and foodCapacity, derive foodStock from foodSecurity
    // foodSecurity = (foodStock / foodCapacity) * 100
    // Therefore: foodStock = (foodSecurity / 100) * foodCapacity
    const raw3 = raw as Record<string, unknown>
    const cityResources = raw3['cityResources'] as Record<string, unknown> | undefined
    if (cityResources) {
      const foodSecurity = cityResources['foodSecurity'] as number | undefined
      const foodCapacity = 1000 // Default capacity
      const foodStock = foodSecurity !== undefined
        ? Math.round((foodSecurity / 100) * foodCapacity)
        : 620 // Default stock (62% of capacity)
      const migratedCityResources = {
        ...cityResources,
        foodStock,
        foodCapacity,
      }
      return gameStateSchema.safeParse({ ...raw3, saveVersion: 4, cityResources: migratedCityResources }).data ?? null
    }
    return gameStateSchema.safeParse({ ...raw3, saveVersion: 4 }).data ?? null
  }

  if (version === 4) {
    // v4 → v5: normalize pending events into concrete event instances
    const raw4 = raw as Record<string, unknown>
    const migrated = gameStateSchema.safeParse(raw4).data
    if (!migrated) return null
    return normalizePendingEventInstances({ ...migrated, saveVersion: 5 })
  }

  if (version === 5 || version === 6) {
    // v5/v6 → v7: the only structural change is the roster → npcRuntimeStates field rename plus the
    // new npcType/playerRosterMember fields, both already applied by
    // migrateRosterFieldToNpcRuntimeStates above (and the remaining new fields carry schema defaults).
    const rawOld = raw as Record<string, unknown>
    return gameStateSchema.safeParse({ ...rawOld, saveVersion: 7 }).data ?? null
  }

  if (version === 7) {
    // v7 is the current version — validate and return.
    const raw7 = raw as Record<string, unknown>
    return gameStateSchema.safeParse(raw7).data ?? null
  }

  // Unknown future version — cannot load
  return null
}

export class LocalSaveSnapshotStore implements SaveGameStore {
  private readonly storage: StorageLike
  private readonly key: string

  constructor(storage: StorageLike, key = 'project-destiny.save') {
    this.storage = storage
    this.key = key
  }

  load(): GameState | null {
    const raw = this.storage.getItem(this.key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    const migrated = migrateState(parsed)

    if (!migrated) {
      console.warn('[SaveStore] Saved state could not be migrated — discarding stale save.')
      this.storage.removeItem(this.key)
      return null
    }

    return normalizePendingEventInstances(migrated)
  }

  save(state: GameState): void {
    const validated = gameStateSchema.parse(state)

    this.storage.setItem(this.key, JSON.stringify(validated))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }
}

export function createBrowserSaveSnapshotStore(key?: string) {
  const storage = isStorageLike(window.localStorage)
    ? window.localStorage
    : createMemoryStorage()

  return new LocalSaveSnapshotStore(storage, key)
}
