import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../application/store/initialGameState'
import { LocalSaveSnapshotStore } from './localSaveSnapshot'

function createMemoryStorage() {
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

describe('LocalSaveSnapshotStore', () => {
  it('round-trips a valid game state snapshot', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    snapshotStore.save(initialGameStateSnapshot)

    const loaded = snapshotStore.load()
    expect(loaded).not.toBeNull()
    expect(loaded?.saveVersion).toBe(7)
    expect(loaded?.inventoryState.player.bagContainers).toBeDefined()
    expect(loaded?.inventoryState.npcInventories).toBeDefined()
  })

  it('returns null when no snapshot is stored', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    expect(snapshotStore.load()).toBeNull()
  })

  it('returns null and clears storage when save is invalid (graceful degradation)', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem('save-slot', JSON.stringify({ day: 'invalid' }))

    const result = snapshotStore.load()
    expect(result).toBeNull()
    // Stale save should be auto-cleared
    expect(storage.getItem('save-slot')).toBeNull()
  })

  it('migrates a v0 save (no saveVersion) to v1 instead of discarding it', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // A minimal v0 save that lacks saveVersion and uses old playerCharacter shape
    const v0Save = {
      ...initialGameStateSnapshot,
      saveVersion: undefined,
      playerCharacter: {
        name: 'Old Hero',
        // old saves had no attributes object — just top-level stats
      },
    }
    // Remove saveVersion key entirely to simulate v0
    const { saveVersion: _omit, ...v0SaveWithoutVersion } = v0Save as typeof v0Save & { saveVersion: unknown }
    void _omit
    storage.setItem('save-slot', JSON.stringify(v0SaveWithoutVersion))

    const result = snapshotStore.load()
    expect(result).not.toBeNull()
    expect(result?.saveVersion).toBe(1)
    expect(result?.playerCharacter.attributes).toBeDefined()
  })

  it('returns null and clears storage for an unknown future save version', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem('save-slot', JSON.stringify({ ...initialGameStateSnapshot, saveVersion: 999 }))

    const result = snapshotStore.load()
    expect(result).toBeNull()
    expect(storage.getItem('save-slot')).toBeNull()
  })

  it('migrates a pre-v7 save (legacy `roster` field) to v7 with npcRuntimeStates + stamped npcType/playerRosterMember', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // Reconstruct a v6 save: the person list was named `roster` and entries lacked npcType,
    // playerRosterMember and the world-only fields (all added in v7).
    const { npcRuntimeStates, ...rest } = initialGameStateSnapshot
    const legacyRoster = npcRuntimeStates.map((npc) => {
      const legacy: Record<string, unknown> = { ...npc }
      delete legacy.npcType
      delete legacy.playerRosterMember
      delete legacy.worldDisposition
      delete legacy.lastContactDay
      delete legacy.locationOverride
      return legacy
    })
    storage.setItem('save-slot', JSON.stringify({ ...rest, roster: legacyRoster, saveVersion: 6 }))

    const loaded = snapshotStore.load()
    expect(loaded).not.toBeNull()
    expect(loaded?.saveVersion).toBe(7)
    // Field renamed; no legacy `roster` key survives.
    expect(loaded?.npcRuntimeStates.length).toBe(npcRuntimeStates.length)
    expect((loaded as unknown as Record<string, unknown>).roster).toBeUndefined()
    // Every pre-v7 person is stamped as a player-roster member of kind 'roster'.
    for (const npc of loaded!.npcRuntimeStates) {
      expect(npc.npcType).toBe('roster')
      expect(npc.playerRosterMember).toBe(true)
    }
  })

  it('migrates a legacy `worldNpcStates` array (destiny-rama.8) into npcRuntimeStates, deriving npcType from each definition', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // Reconstruct a save shaped like the C1-only migration result: roster already renamed to
    // npcRuntimeStates, but worldNpcStates still holds the old thin per-person shape (this is
    // exactly what a saveVersion:7 save produced by the rama.7-only code looked like, before rama.8
    // added the fold — the guard in migrateWorldNpcStatesIntoNpcRuntimeStates is array-presence
    // based, not version based, specifically so this shape gets folded too).
    const legacyWorldNpcStates = [
      {
        npcId: 'npc-dalen-morke',
        lastContactDay: 3,
        disposition: 'unknown',
        locationOverride: 'poi-test-location',
        flags: ['mira-custody-handler'],
        intimacyStage: 'none',
        pregnancyState: null,
        health: 80,
        injury: 10,
        recovering: true,
        clothing: { head: null, torso: 'cloth-doublet-noble', arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
      },
      {
        npcId: 'npc-nonexistent-legacy-world-npc',
        lastContactDay: null,
        disposition: 'neutral',
        locationOverride: null,
        flags: [],
        intimacyStage: 'none',
        pregnancyState: null,
        health: 100,
        injury: 0,
        recovering: false,
        clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
        armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
      },
    ]
    const { npcRuntimeStates, ...rest } = initialGameStateSnapshot
    // Simulate the pre-rama.8 state: the 3 world entries live only under the legacy key, not yet in
    // npcRuntimeStates (which here holds only Marion — npcRuntimeStates[0]).
    const rosterOnly = [npcRuntimeStates[0]!]
    storage.setItem(
      'save-slot',
      JSON.stringify({ ...rest, npcRuntimeStates: rosterOnly, worldNpcStates: legacyWorldNpcStates, saveVersion: 7 }),
    )

    const loaded = snapshotStore.load()
    expect(loaded).not.toBeNull()
    expect(loaded?.saveVersion).toBe(7)
    expect((loaded as unknown as Record<string, unknown>).worldNpcStates).toBeUndefined()

    const dalen = loaded!.npcRuntimeStates.find((n) => n.npcId === 'npc-dalen-morke')
    expect(dalen).toBeDefined()
    // npcType comes from Dalen's own definition ('story'), NOT hardcoded 'world' — two of the three
    // shipped world entries are npcType:'enemy' by definition (destiny-rama.14 drift), so blanket
    // stamping 'world' would plant a wrong fact into the schema.
    expect(dalen!.npcType).toBe('story')
    expect(dalen!.playerRosterMember).toBe(false)
    expect(dalen!.worldDisposition).toBe('unknown')
    expect(dalen!.lastContactDay).toBe(3)
    expect(dalen!.locationOverride).toBe('poi-test-location')
    expect(dalen!.flags).toEqual(['mira-custody-handler'])
    expect(dalen!.states.health).toBe(80)
    expect(dalen!.states.injury).toBe(10)
    expect(dalen!.assignment).toBe('recovering')
    expect(dalen!.clothing.torso).toBe('cloth-doublet-noble')

    // A legacy entry whose definition no longer exists is dropped, not fatal to the whole load.
    expect(loaded!.npcRuntimeStates.some((n) => n.npcId === 'npc-nonexistent-legacy-world-npc')).toBe(false)

    // Marion (already present under the new name) is untouched, not duplicated.
    expect(loaded!.npcRuntimeStates.filter((n) => n.npcId === npcRuntimeStates[0]!.npcId)).toHaveLength(1)
  })

  it('does not duplicate or overwrite a legacy worldNpcStates entry whose npcId already has a npcRuntimeStates entry', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    const { npcRuntimeStates, ...rest } = initialGameStateSnapshot
    const dalenAlreadyPresent = npcRuntimeStates.find((n) => n.npcId === 'npc-dalen-morke')!
    storage.setItem(
      'save-slot',
      JSON.stringify({
        ...rest,
        npcRuntimeStates,
        worldNpcStates: [
          {
            npcId: 'npc-dalen-morke',
            lastContactDay: null,
            disposition: 'hostile', // deliberately different from the already-present entry
            locationOverride: null,
            flags: [],
            intimacyStage: 'none',
            pregnancyState: null,
            health: 50,
            injury: 50,
            recovering: false,
            clothing: { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
            armor: { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
          },
        ],
        saveVersion: 7,
      }),
    )

    const loaded = snapshotStore.load()
    const dalenEntries = loaded!.npcRuntimeStates.filter((n) => n.npcId === 'npc-dalen-morke')
    expect(dalenEntries).toHaveLength(1)
    // The already-present entry wins untouched — the legacy duplicate (disposition:'hostile',
    // health:50) is discarded rather than overwriting it.
    expect(dalenEntries[0]!.worldDisposition).toBe(dalenAlreadyPresent.worldDisposition)
    expect(dalenEntries[0]!.states.health).toBe(dalenAlreadyPresent.states.health)
  })

  it('migrates a legacy `npcCaptivityStates` record (destiny-rama.9) into npcRuntimeStates[].captivityState, hydrating a person who has no prior runtime entry', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // Mira has no npcRuntimeStates entry in this legacy shape — only the registry knows about her,
    // matching the pre-rama.9 save format.
    const { npcRuntimeStates } = initialGameStateSnapshot
    const withoutMira = npcRuntimeStates.filter((n) => n.npcId !== 'npc-mira')
    storage.setItem(
      'save-slot',
      JSON.stringify({
        ...initialGameStateSnapshot,
        npcRuntimeStates: withoutMira,
        npcCaptivityStates: {
          'npc-mira': {
            status: 'captive',
            holderId: 'faction-gilded-court',
            siteId: 'site-poi-pale-old-tannery',
            roomId: 'tannery-inner-ring',
            regime: 'guarded',
            condition: 'hurt',
            compliance: 'resistant',
            bondType: 'fear',
            timeHeldDays: 21,
            lastTransferDay: 0,
            questTag: 'quest-mira-rescue',
            confiscatedItems: [],
            confiscatedMoney: null,
            confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
          },
        },
        saveVersion: 7,
      }),
    )

    const loaded = snapshotStore.load()
    expect(loaded).not.toBeNull()
    expect((loaded as unknown as Record<string, unknown>).npcCaptivityStates).toBeUndefined()

    const mira = loaded!.npcRuntimeStates.find((n) => n.npcId === 'npc-mira')
    expect(mira).toBeDefined()
    // npcType comes from Mira's own definition ('story'), not an assumed value.
    expect(mira!.npcType).toBe('story')
    expect(mira!.playerRosterMember).toBe(false)
    expect(mira!.captivityState?.status).toBe('captive')
    expect(mira!.captivityState?.siteId).toBe('site-poi-pale-old-tannery')
    expect(mira!.captivityState?.timeHeldDays).toBe(21)
  })

  it('folds a legacy `npcCaptivityStates` entry onto an EXISTING npcRuntimeStates person instead of creating a duplicate', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    // Marion already has a runtime entry (she's the starting roster member) — simulate her being
    // captured, with captivity recorded only in the legacy registry (pre-rama.9 shape).
    storage.setItem(
      'save-slot',
      JSON.stringify({
        ...initialGameStateSnapshot,
        npcCaptivityStates: {
          'npc-marion-vale': {
            status: 'captive',
            holderId: 'faction-gilded-court',
            siteId: 'site-poi-pale-old-tannery',
            roomId: null,
            regime: 'guarded',
            condition: 'healthy',
            compliance: 'resistant',
            bondType: 'none',
            timeHeldDays: 1,
            lastTransferDay: null,
            questTag: null,
            confiscatedItems: [],
            confiscatedMoney: null,
            confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
          },
        },
        saveVersion: 7,
      }),
    )

    const loaded = snapshotStore.load()
    const marionEntries = loaded!.npcRuntimeStates.filter((n) => n.npcId === 'npc-marion-vale')
    expect(marionEntries).toHaveLength(1)
    expect(marionEntries[0]!.captivityState?.status).toBe('captive')
    // Her existing roster identity (playerRosterMember, npcType) is untouched by the fold.
    expect(marionEntries[0]!.playerRosterMember).toBe(true)
    expect(marionEntries[0]!.npcType).toBe('roster')
  })

  it('normalizes legacy pending events into concrete event instances on load', () => {
    const storage = createMemoryStorage()
    const snapshotStore = new LocalSaveSnapshotStore(storage, 'save-slot')

    storage.setItem(
      'save-slot',
      JSON.stringify({
        ...initialGameStateSnapshot,
        pendingEvents: [{ eventId: 'event-unpaid-wages-unrest', firedOnDay: 3 }],
        eventInstances: [],
      }),
    )

    const result = snapshotStore.load()

    expect(result?.pendingEvents[0]?.instanceId).toBeTruthy()
    expect(result?.eventInstances).toHaveLength(1)
    expect(result?.eventInstances[0]).toMatchObject({
      eventId: 'event-unpaid-wages-unrest',
      firedOnDay: 3,
      resolvedOnDay: null,
    })
  })
})
