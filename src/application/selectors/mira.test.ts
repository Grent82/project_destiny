import { describe, expect, it } from 'vitest'

import { createGameStore } from '../store/gameStore'
import { selectMiraCustodyChain } from './mira'

describe('Mira custody chain selector', () => {
  it('resolves one canonical Court handler and at least two tannery guards on a fresh save', () => {
    const store = createGameStore()
    const chain = selectMiraCustodyChain(store.getState())

    expect(chain).not.toBeNull()
    if (!chain) throw new Error('expected Mira custody chain')

    expect(chain.siteId).toBe('site-poi-pale-old-tannery')
    expect(chain.handler.npcId).toBe('npc-dalen-morke')
    expect(chain.guardPresences).toHaveLength(2)
    expect(chain.guardPresences.map((presence) => presence.npcId)).toEqual(
      expect.arrayContaining(['npc-enemy-tomas-rell', 'npc-enemy-catrin-hale']),
    )
  })

  it('links all seeded guards to valid old tannery rooms and the same captivity site as Mira', () => {
    const store = createGameStore()
    const chain = selectMiraCustodyChain(store.getState())
    const captivity = store.getState().game.npcCaptivityStates['npc-mira']

    expect(chain).not.toBeNull()
    if (!chain) throw new Error('expected Mira custody chain')
    if (!captivity) throw new Error('expected Mira captivity state')

    expect(captivity.siteId).toBe(chain.siteId)
    expect(chain.guardPresences.map((presence) => presence.roomId)).toEqual(
      expect.arrayContaining(['tannery-yard', 'tannery-holding-floor']),
    )
    expect(chain.guardPresences.every((presence) => presence.roomName !== null)).toBe(true)
  })
})
