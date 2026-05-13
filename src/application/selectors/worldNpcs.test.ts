import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { selectWorldNpcStates, selectWorldNpcState, selectWorldNpcView } from './worldNpcs'
import { contentCatalog } from '../content/contentCatalog'

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
})
