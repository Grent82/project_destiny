import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { selectWorldNpcStates, selectWorldNpcState, selectWorldNpcView, selectNpcBonds, selectDiscoverableBonds, selectWorldNpcViewsByDistrict } from './worldNpcs'
import { contentCatalog } from '../content/contentCatalog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

describe('worldNpc runtime state selectors', () => {
  it('starts with empty worldNpcStates', () => {
    const store = createGameStore()
    const states = selectWorldNpcStates(store.getState())
    expect(states).toEqual([])
  })

  it('returns null for unknown NPC before any update', () => {
    const store = createGameStore()
    const state = selectWorldNpcState('npc-unknown')(store.getState())
    expect(state).toBeNull()
  })

  it('updateWorldNpcState creates a new entry', () => {
    const store = createGameStore()
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', disposition: 'friendly', lastContactDay: 5 }))
    const entry = selectWorldNpcState('npc-ida')(store.getState())
    expect(entry).not.toBeNull()
    expect(entry!.disposition).toBe('friendly')
    expect(entry!.lastContactDay).toBe(5)
  })

  it('updateWorldNpcState patches an existing entry', () => {
    const store = createGameStore()
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', disposition: 'neutral' }))
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', disposition: 'hostile', addFlags: ['threatened'] }))
    const entry = selectWorldNpcState('npc-ida')(store.getState())
    expect(entry!.disposition).toBe('hostile')
    expect(entry!.flags).toContain('threatened')
  })

  it('addFlags does not duplicate existing flags', () => {
    const store = createGameStore()
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', addFlags: ['threatened'] }))
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', addFlags: ['threatened'] }))
    const entry = selectWorldNpcState('npc-ida')(store.getState())
    expect(entry!.flags.filter((f) => f === 'threatened').length).toBe(1)
  })

  it('removeFlags removes a flag', () => {
    const store = createGameStore()
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', addFlags: ['threatened', 'bribed'] }))
    store.dispatch(gameActions.updateWorldNpcState({ npcId: 'npc-ida', removeFlags: ['threatened'] }))
    const entry = selectWorldNpcState('npc-ida')(store.getState())
    expect(entry!.flags).not.toContain('threatened')
    expect(entry!.flags).toContain('bribed')
  })

  it('locationOverride overrides schedule in selectWorldNpcView', () => {
    const store = createGameStore()
    const worldNpc = contentCatalog.npcs.find((n) => n.npcType === 'world' || n.npcType === 'story')
    if (!worldNpc) return // Skip if no world NPCs defined
    store.dispatch(gameActions.updateWorldNpcState({ npcId: worldNpc.id, locationOverride: 'poi-test-override' }))
    const view = selectWorldNpcView(worldNpc.id, 'morning')(store.getState())
    expect(view).not.toBeNull()
    expect(view!.currentLocationId).toBe('poi-test-override')
  })

  it('selectWorldNpcView returns null for unknown NPC', () => {
    const store = createGameStore()
    const view = selectWorldNpcView('npc-does-not-exist', 'morning')(store.getState())
    expect(view).toBeNull()
  })

  it('anchors scheduled NPCs at authored POIs in district views', () => {
    const store = createGameStore()
    const views = selectWorldNpcViewsByDistrict(store.getState(), 'district-harbor', 'afternoon')
    const torvald = views.find((entry) => entry.npcId === 'npc-torvald-messe')

    expect(torvald).toBeDefined()
    expect(torvald?.currentLocationId).toBe('poi-harbor-guild-hall')
  })

  it('selectNpcBonds returns soft-bond edges for a world NPC', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      relationships: {
        [buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')]: {
          affinity: 18,
          respect: 0,
          fear: 0,
          trust: 22,
          loyalty: 8,
          bondType: 'friendship',
          softBond: { strength: 42, since: 3, visibility: 'rumored' },
        },
      },
    })

    const bonds = selectNpcBonds('npc-garet-doyle')(store.getState())
    expect(bonds).toHaveLength(1)
    expect(bonds[0]?.toNpcId).toBe('npc-sister-vael')
    expect(bonds[0]?.softBond.visibility).toBe('rumored')
  })

  it('selectDiscoverableBonds only returns rumored or known soft bonds', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      relationships: {
        [buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')]: {
          affinity: 18,
          respect: 0,
          fear: 0,
          trust: 22,
          loyalty: 8,
          bondType: 'friendship',
          softBond: { strength: 42, since: 3, visibility: 'rumored' },
        },
        [buildRelationshipKey('npc-old-maret', 'npc-cutter')]: {
          affinity: 10,
          respect: 0,
          fear: 0,
          trust: 10,
          loyalty: 4,
          bondType: 'friendship',
          softBond: { strength: 20, since: 4, visibility: 'hidden' },
        },
      },
    })

    const discoverable = selectDiscoverableBonds(store.getState())
    expect(discoverable.some((bond) => bond.fromNpcId === 'npc-garet-doyle' && bond.toNpcId === 'npc-sister-vael')).toBe(true)
    expect(discoverable.some((bond) => bond.fromNpcId === 'npc-old-maret' && bond.toNpcId === 'npc-cutter')).toBe(false)
  })
})
