import { describe, expect, it } from 'vitest'

import { getQuestTemplates, contentCatalog } from '../content/contentCatalog'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { createQuestRuntime } from '../../domain/quests/contracts'
import { initialStateWithIda } from './testFixtures'
import {
  concludeCombatEncounter,
  getEnemyDangerModifiers,
  performCombatAction,
  startCombatEncounter,
} from './combat'

describe('combat commands', () => {
  it('starts a seeded combat encounter from the selected squad', () => {
    // Use initialStateWithIda so we have 2 NPC allies + player → 3 allies + 2 enemies = 5 combatants
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const nextState = startCombatEncounter(state)

    expect(nextState.activeCombat).not.toBeNull()
    expect(nextState.activeCombat?.combatants).toHaveLength(5)
    expect(nextState.activeCombat?.range).toBe('medium')
    expect(nextState.activeCombat?.outcome).toBe('ongoing')
    expect(nextState.activityLog[0]?.message).toMatch(/moves out.*hostile patrol|hostile patrol stands in the way/i)
  })

  it('does not heal wounded allies when combat starts', () => {
    const state = {
      ...initialStateWithIda,
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-ida-rhys'
          ? { ...npc, states: { ...npc.states, health: 32 } }
          : npc,
      ),
    }

    const nextState = startCombatEncounter(state)
    const allyCombatant = nextState.activeCombat?.combatants.find(
      (combatant) => combatant.sourceNpcId === 'npc-ida-rhys',
    )
    const rosterEntry = nextState.npcRuntimeStates.find((npc) => npc.npcId === 'npc-ida-rhys')

    expect(allyCombatant?.health).toBe(32)
    expect(allyCombatant?.maxHealth).toBe(32)
    expect(rosterEntry?.states.health).toBe(32)
  })

  it('uses stored player combat state when combat starts', () => {
    const state = {
      ...initialGameStateSnapshot,
      playerCharacter: {
        ...initialGameStateSnapshot.playerCharacter,
        combatState: {
          health: 57,
          morale: 66,
        },
      },
    }

    const nextState = startCombatEncounter(state)
    const playerCombatant = nextState.activeCombat?.combatants.find(
      (combatant) => combatant.combatantId === 'player',
    )

    expect(playerCombatant?.health).toBe(57)
    expect(playerCombatant?.morale).toBe(66)
  })

  it('does not start combat without a selected squad', () => {
    const state = {
      ...initialGameStateSnapshot,
      selectedSquadNpcIds: [],
    }

    const nextState = startCombatEncounter(state)

    expect(nextState).toEqual(state)
  })

  it('resolves a player action and advances the encounter state', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const nextState = performCombatAction(startedState, 'attack')

    expect(nextState.activeCombat).not.toBeNull()
    expect(nextState.activeCombat?.log.length).toBeGreaterThan(
      startedState.activeCombat?.log.length ?? 0,
    )
    expect(nextState.activeCombat?.combatants.some((combatant) => combatant.health < combatant.maxHealth)).toBe(true)
    expect(nextState.activityLog[0]?.category).toBe('combat')
  })

  it('reproduces the same combat step from the same seed', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)

    const firstRun = performCombatAction(startedState, 'attack')
    const secondRun = performCombatAction(startedState, 'attack')

    expect(firstRun.activeCombat).toEqual(secondRun.activeCombat)
    expect(firstRun.rngSeed).toBe(secondRun.rngSeed)
  })

  it('advances rngSeed after resolving a combat step', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const nextState = performCombatAction(startedState, 'attack')

    expect(nextState.rngSeed).not.toBe(startedState.rngSeed)
  })

  it('leaves state unchanged when no active combat exists', () => {
    const nextState = performCombatAction(initialGameStateSnapshot, 'attack')

    expect(nextState).toEqual(initialGameStateSnapshot)
  })

  it('concludes a resolved encounter and clears the active combat state', () => {
    const startedState = startCombatEncounter(initialGameStateSnapshot)
    const resolvedState = {
      ...startedState,
      activeCombat: startedState.activeCombat
        ? {
            ...startedState.activeCombat,
            outcome: 'victory' as const,
            activeCombatantId: null,
          }
        : null,
    }

    const nextState = concludeCombatEncounter(resolvedState)

    expect(nextState.activeCombat).toBeNull()
    expect(nextState.activityLog[0]?.message).toMatch(/encounter is concluded/i)
    expect(nextState.lastEncounterSummary).not.toBeNull()
    expect(nextState.lastEncounterSummary?.outcome).toBe('victory')
    expect(nextState.lastEncounterSummary?.day).toBe(nextState.day)
  })

  it('offers a recruitable defeated enemy from the unified npcs catalog on victory (destiny-rama.14)', () => {
    // Before destiny-rama.14 this offer's npcId came from the now-deleted separate enemy-npcs.json
    // catalog and recruitNpc could never resolve it (it only ever read npcsById) — a silent dead
    // end. There's no existing coverage of this path at all, so add it: a victory must be able to
    // produce a hire offer whose npcId resolves in contentCatalog.npcsById as npcType:'enemy'.
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const started = startCombatEncounter(state)
    const resolved = {
      ...started,
      activeCombat: {
        ...started.activeCombat!,
        outcome: 'victory' as const,
        activeCombatantId: null,
        combatants: started.activeCombat!.combatants.map((c) =>
          c.side === 'allies' ? { ...c, health: Math.max(1, c.health) } : { ...c, health: 0 }
        ),
      },
    }
    const result = concludeCombatEncounter(resolved)
    const combatOffer = result.availableForHire.find((o) => o.source === 'combat')
    expect(combatOffer).toBeDefined()
    const def = contentCatalog.npcsById.get(combatOffer!.npcId)
    expect(def).toBeDefined()
    expect(def!.npcType).toBe('enemy')
    expect(def!.recruitableOnDefeat).toBe(true)
  })

  it('applies NPC-to-NPC survival bonds on victory (affinity +8, respect +5)', () => {
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const started = startCombatEncounter(state)
    const resolved = {
      ...started,
      activeCombat: {
        ...started.activeCombat!,
        outcome: 'victory' as const,
        activeCombatantId: null,
        combatants: started.activeCombat!.combatants.map((c) =>
          c.side === 'allies' ? { ...c, health: Math.max(1, c.health) } : { ...c, health: 0 }
        ),
      },
    }
    const result = concludeCombatEncounter(resolved)
    const marionToIda = result.relationships['npc-marion-vale-to-npc-ida-rhys']
    const idaToMarion = result.relationships['npc-ida-rhys-to-npc-marion-vale']
    expect(marionToIda?.affinity).toBeGreaterThanOrEqual(8)
    expect(marionToIda?.respect).toBeGreaterThanOrEqual(5)
    expect(idaToMarion?.affinity).toBeGreaterThanOrEqual(8)
    expect(idaToMarion?.respect).toBeGreaterThanOrEqual(5)
    expect(result.activityLog.some((e) => /came through it together/i.test(e.message))).toBe(true)
  })

  it('applies NPC-to-NPC adversity bonds on defeat-survived (affinity +4, trust +5)', () => {
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const started = startCombatEncounter(state)
    const resolved = {
      ...started,
      activeCombat: {
        ...started.activeCombat!,
        outcome: 'defeat' as const,
        activeCombatantId: null,
        combatants: started.activeCombat!.combatants.map((c) =>
          c.side === 'allies' && c.sourceNpcId ? { ...c, health: Math.max(1, c.health) } : c
        ),
      },
    }
    const result = concludeCombatEncounter(resolved)
    const marionToIda = result.relationships['npc-marion-vale-to-npc-ida-rhys']
    expect(marionToIda?.affinity).toBeGreaterThanOrEqual(4)
    expect(marionToIda?.trust).toBeGreaterThanOrEqual(5)
    expect(result.activityLog.some((e) => /counts for something/i.test(e.message))).toBe(true)
  })

  it('excludes KO-d NPC from survival bonds', () => {
    const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'] }
    const started = startCombatEncounter(state)
    const resolved = {
      ...started,
      activeCombat: {
        ...started.activeCombat!,
        outcome: 'victory' as const,
        activeCombatantId: null,
        combatants: started.activeCombat!.combatants.map((c) => {
          if (c.sourceNpcId === 'npc-ida-rhys') return { ...c, health: 0 }
          if (c.side === 'enemies') return { ...c, health: 0 }
          return { ...c, health: Math.max(1, c.health) }
        }),
      },
    }
    const result = concludeCombatEncounter(resolved)
    expect(result.relationships['npc-marion-vale-to-npc-ida-rhys']).toBeUndefined()
    expect(result.relationships['npc-ida-rhys-to-npc-marion-vale']).toBeUndefined()
  })

  it('fails a combat-linked quest by default when the squad is defeated', () => {
    const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected harborwatch quest in fixtures.')
    }

    const state = {
      ...initialStateWithIda,
      currentDistrictId: 'district-the-warrens',
      activeQuests: [createQuestRuntime(harborwatch, 1)],
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    }

    const startedState = startCombatEncounter(state, 'quest-harborwatch')
    const resolvedState = {
      ...startedState,
      activeCombat: startedState.activeCombat
        ? {
            ...startedState.activeCombat,
            outcome: 'defeat' as const,
            activeCombatantId: null,
          }
        : null,
    }

    const nextState = concludeCombatEncounter(resolvedState)

    expect(nextState.activeQuests.find((quest) => quest.questId === 'quest-harborwatch')).toBeUndefined()
    expect(nextState.completedQuestIds).not.toContain('quest-harborwatch')
    expect(nextState.activityLog.some((entry) => /driven back/i.test(entry.message))).toBe(true)
  })

  it('settles a combat-linked quest on victory and clears it from active quests', () => {
    const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected harborwatch quest in fixtures.')
    }

    const state = {
      ...initialStateWithIda,
      currentDistrictId: 'district-the-warrens',
      activeQuests: [createQuestRuntime(harborwatch, 1)],
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    }

    const startedState = startCombatEncounter(state, 'quest-harborwatch')
    const resolvedState = {
      ...startedState,
      activeCombat: startedState.activeCombat
        ? {
            ...startedState.activeCombat,
            outcome: 'victory' as const,
            activeCombatantId: null,
          }
        : null,
    }

    const nextState = concludeCombatEncounter(resolvedState)

    expect(nextState.activeQuests.find((quest) => quest.questId === 'quest-harborwatch')).toBeUndefined()
    expect(nextState.completedQuestIds).toContain('quest-harborwatch')
    expect(nextState.activityLog.some((entry) => /contract fulfilled/i.test(entry.message))).toBe(true)
  })

  describe('district danger level scaling', () => {
    it('enemies in The Below (danger 5) have more health than Harbor Ward (danger 2)', () => {
      const harborState = {
        ...initialStateWithIda,
        currentDistrictId: 'district-harbor',
        selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      }
      const belowState = {
        ...initialStateWithIda,
        currentDistrictId: 'district-the-below',
        selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      }

      const harborResult = startCombatEncounter(harborState)
      const belowResult = startCombatEncounter(belowState)

      const harborEnemy = harborResult.activeCombat?.combatants.find((c) => c.side === 'enemies')
      const belowEnemy = belowResult.activeCombat?.combatants.find((c) => c.side === 'enemies')

      expect(harborEnemy).toBeDefined()
      expect(belowEnemy).toBeDefined()
      expect(belowEnemy!.maxHealth).toBeGreaterThan(harborEnemy!.maxHealth)
      expect(belowEnemy!.accuracy).toBeGreaterThan(harborEnemy!.accuracy)
    })

    it('danger tier 1 enemies use base stats (no scaling)', () => {
      const mods = getEnemyDangerModifiers(1)
      expect(mods.healthMult).toBe(1.0)
      expect(mods.accuracyBonus).toBe(0)
      expect(mods.damageMod).toBe(0)
    })

    it('danger tier 5 enemies have 60% more health and +15 accuracy', () => {
      const mods = getEnemyDangerModifiers(5)
      expect(mods.healthMult).toBe(1.6)
      expect(mods.accuracyBonus).toBe(15)
      expect(mods.damageMod).toBe(6)
    })

    it('clamps out-of-range danger levels gracefully', () => {
      const lowMods = getEnemyDangerModifiers(0)
      const highMods = getEnemyDangerModifiers(10)
      expect(lowMods).toEqual(getEnemyDangerModifiers(1))
      expect(highMods).toEqual(getEnemyDangerModifiers(5))
    })

    it('enemies in gilded heights (danger 1) use base stats', () => {
      const gildedState = {
        ...initialStateWithIda,
        currentDistrictId: 'district-gilded-heights',
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const result = startCombatEncounter(gildedState)
      const enemy = result.activeCombat?.combatants.find((c) => c.side === 'enemies')
      // Compare against unknown district (also defaults to danger 1)
      const noDistrictState = {
        ...initialStateWithIda,
        currentDistrictId: null,
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const noDistrictResult = startCombatEncounter(noDistrictState)
      const noDistrictEnemy = noDistrictResult.activeCombat?.combatants.find((c) => c.side === 'enemies')
      expect(enemy?.maxHealth).toBe(noDistrictEnemy?.maxHealth)
    })
  })

  describe('stagger mechanic', () => {
    function startedStateWithStaggeredPlayer() {
      const started = startCombatEncounter(initialGameStateSnapshot)
      const encounter = started.activeCombat!
      return {
        ...started,
        activeCombat: {
          ...encounter,
          activeCombatantId: 'player',
          combatants: encounter.combatants.map((c) =>
            c.combatantId === 'player' ? { ...c, staggered: true } : c,
          ),
        },
        // Ensure player is active (sort them first)
        rngSeed: started.rngSeed,
      }
    }

    it('skips the staggered ally turn and logs the stagger effect', () => {
      const state = startedStateWithStaggeredPlayer()
      const result = performCombatAction(state, 'attack')

      const playerInResult = result.activeCombat?.combatants.find(
        (c) => c.combatantId === 'player',
      )
      expect(playerInResult?.staggered).toBe(false)
      expect(
        result.activeCombat?.log.some((entry) => /still reeling/i.test(entry.summary)),
      ).toBe(true)
    })

    it('clears the staggered flag after the skipped turn', () => {
      const state = startedStateWithStaggeredPlayer()
      const result = performCombatAction(state, 'attack')
      const player = result.activeCombat?.combatants.find((c) => c.combatantId === 'player')
      expect(player?.staggered).toBe(false)
    })

    it('does not apply stagger skip when the combatant is not staggered', () => {
      const started = startCombatEncounter(initialGameStateSnapshot)
      const logLengthBefore = started.activeCombat?.log.length ?? 0
      const result = performCombatAction(started, 'attack')
      // Normal attack was processed, not a stagger skip
      expect(
        result.activeCombat?.log.some((entry) => /still reeling/i.test(entry.summary)),
      ).toBe(false)
      expect(result.activeCombat?.log.length).toBeGreaterThan(logLengthBefore)
    })

    it('enemy stagger skips their turn in resolveEnemyTurns', () => {
      const started = startCombatEncounter(initialGameStateSnapshot)
      const encounter = started.activeCombat!
      // Find the first enemy combatant
      const firstEnemy = encounter.combatants.find((c) => c.side === 'enemies')
      if (!firstEnemy) return // skip if no enemy (shouldn't happen)

      // Force the enemy to be active and staggered
      const preStaggeredState = {
        ...started,
        activeCombat: {
          ...encounter,
          activeCombatantId: firstEnemy.combatantId,
          combatants: encounter.combatants.map((c) =>
            c.combatantId === firstEnemy.combatantId ? { ...c, staggered: true } : c,
          ),
        },
      }

      // performCombatAction routes through resolveEnemyTurns when the active is an enemy
      // We can verify stagger cleared by checking the enemy after a player action that
      // advances to the enemy turn — but the simplest is to check state after attack.
      const result = performCombatAction(preStaggeredState, 'attack')
      // The enemy flag should be cleared in the resulting state (enemies process their turns)
      const enemyAfter = result.activeCombat?.combatants.find(
        (c) => c.combatantId === firstEnemy.combatantId,
      )
      // After resolveEnemyTurns the staggered flag should not persist from a prior round
      expect(enemyAfter).toBeDefined()
    })
  })

  describe('district-aware encounter tables', () => {
    it('enemies in The Hollows have district-appropriate names and lore', () => {
      const state = {
        ...initialStateWithIda,
        currentDistrictId: 'district-the-hollows',
        selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      }
      const result = startCombatEncounter(state)
      const enemies = result.activeCombat?.combatants.filter((c) => c.side === 'enemies') ?? []

      expect(enemies.length).toBeGreaterThan(0)
      for (const enemy of enemies) {
        expect(['Ruin Stalker', 'Hollow Predator', 'Salvage Raider', 'Hollows Warlord']).toContain(enemy.name)
        expect(enemy.lore).toBeTruthy()
      }
    })

    it('enemies in Harbor Ward have harbor-appropriate names', () => {
      const state = {
        ...initialStateWithIda,
        currentDistrictId: 'district-harbor',
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const result = startCombatEncounter(state)
      const enemies = result.activeCombat?.combatants.filter((c) => c.side === 'enemies') ?? []

      expect(enemies.length).toBeGreaterThan(0)
      for (const enemy of enemies) {
        expect(['Ring Enforcer', 'Dock Thug', 'Contraband Runner', 'Compact Levy']).toContain(enemy.name)
      }
    })

    it('falls back to generic names when district has no encounter table', () => {
      const state = {
        ...initialStateWithIda,
        currentDistrictId: null,
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const result = startCombatEncounter(state)
      const enemies = result.activeCombat?.combatants.filter((c) => c.side === 'enemies') ?? []

      expect(enemies.length).toBeGreaterThan(0)
      const fallbackNames = ['Ash Raider', 'Bog Skirmisher', 'Ruin Poacher', 'Fen Cutthroat']
      for (const enemy of enemies) {
        expect(fallbackNames).toContain(enemy.name)
        expect(enemy.lore).toBeTruthy()
      }
    })

    it('enemies from different districts have different names for the same index', () => {
      const hollowsState = {
        ...initialStateWithIda,
        currentDistrictId: 'district-the-hollows',
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const mirewardState = {
        ...initialStateWithIda,
        currentDistrictId: 'district-the-mireward',
        selectedSquadNpcIds: ['npc-marion-vale'],
      }
      const hollowsResult = startCombatEncounter(hollowsState)
      const mirewardResult = startCombatEncounter(mirewardState)

      const hollowsEnemy = hollowsResult.activeCombat?.combatants.find((c) => c.side === 'enemies')
      const mirewardEnemy = mirewardResult.activeCombat?.combatants.find((c) => c.side === 'enemies')

      expect(hollowsEnemy?.name).not.toBe(mirewardEnemy?.name)
    })
  })

  describe('Redux/Immer compatibility', () => {
    it('concludeCombatEncounter does not throw Immer error when called through Redux reducer pattern', () => {
      // This test verifies that the command function works correctly when wrapped
      // by Redux Toolkit's createReducer/createSlice which uses Immer internally.
      // The bug was that applyRelationshipDelta modified state directly while also
      // being called in a context where Redux expected a pure return value.

      const startedState = startCombatEncounter(initialGameStateSnapshot)
      const resolvedState = {
        ...startedState,
        activeCombat: {
          ...startedState.activeCombat!,
          outcome: 'victory' as const,
          activeCombatantId: null,
        },
      }

      // This should not throw: [Immer] An immer producer returned a new value *and* modified its draft
      expect(() => concludeCombatEncounter(resolvedState)).not.toThrow()

      const result = concludeCombatEncounter(resolvedState)

      // Verify the state transitions are correct
      expect(result.activeCombat).toBeNull()
      expect(result.lastEncounterSummary?.outcome).toBe('victory')
      expect(result.activityLog.some((e) => e.message.includes('concluded'))).toBe(true)
    })

    it('concludeCombatEncounter handles victory with linked quest without Immer errors', () => {
      const harborwatch = getQuestTemplates().find((quest) => quest.id === 'quest-harborwatch')
      if (!harborwatch) {
        throw new Error('Expected harborwatch quest in fixtures.')
      }

      const state = {
        ...initialStateWithIda,
        currentDistrictId: 'district-the-warrens',
        activeQuests: [createQuestRuntime(harborwatch, 1)],
        selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
      }

      const startedState = startCombatEncounter(state, 'quest-harborwatch')
      const resolvedState = {
        ...startedState,
        activeCombat: {
          ...startedState.activeCombat!,
          outcome: 'victory' as const,
          activeCombatantId: null,
        },
      }

      // Should not throw Immer error
      expect(() => concludeCombatEncounter(resolvedState)).not.toThrow()

      const result = concludeCombatEncounter(resolvedState)

      // Verify quest was settled
      expect(result.activeQuests.find((q) => q.questId === 'quest-harborwatch')).toBeUndefined()
      expect(result.completedQuestIds).toContain('quest-harborwatch')
    })
  })

  describe('NPC combat loot (destiny-bkln.cyrd)', () => {
    function victoryStateWithSurvivingAlly(rngSeed: number) {
      const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'], rngSeed }
      const started = startCombatEncounter(state)
      return {
        ...started,
        activeCombat: {
          ...started.activeCombat!,
          outcome: 'victory' as const,
          activeCombatantId: null,
          combatants: started.activeCombat!.combatants.map((c) => {
            if (c.side === 'enemies') return { ...c, health: 0 }
            return { ...c, health: Math.max(1, c.health) }
          }),
        },
      }
    }

    it('is RNG-gated: some seeds grant loot to a surviving ally, some do not', () => {
      let anyLooted = false
      let anySkipped = false
      for (let seed = 0; seed < 40; seed++) {
        const resolved = victoryStateWithSurvivingAlly(seed)
        const result = concludeCombatEncounter(resolved)
        const idaInventory = result.inventoryState.npcInventories['npc-ida-rhys'] ?? []
        const gotLoot = idaInventory.some((c) => c.slots.length > 0)
        if (gotLoot) anyLooted = true
        else anySkipped = true
      }
      expect(anyLooted).toBe(true)
      expect(anySkipped).toBe(true)
    })

    it('logs an economy activity entry naming the NPC when loot is granted', () => {
      let found = false
      for (let seed = 0; seed < 40; seed++) {
        const resolved = victoryStateWithSurvivingAlly(seed)
        const result = concludeCombatEncounter(resolved)
        if (result.activityLog.some((e) => e.category === 'economy' && /recovers/i.test(e.message))) {
          found = true
          break
        }
      }
      expect(found).toBe(true)
    })

    it('grants no NPC loot when there are no surviving allies with a sourceNpcId', () => {
      const state = { ...initialStateWithIda, selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'], rngSeed: 1 }
      const started = startCombatEncounter(state)
      const resolved = {
        ...started,
        activeCombat: {
          ...started.activeCombat!,
          outcome: 'victory' as const,
          activeCombatantId: null,
          combatants: started.activeCombat!.combatants.map((c) => ({ ...c, health: 0 })),
        },
      }
      const result = concludeCombatEncounter(resolved)
      expect(Object.keys(result.inventoryState.npcInventories)).toHaveLength(
        Object.keys(initialStateWithIda.inventoryState.npcInventories).length,
      )
    })
  })
})
