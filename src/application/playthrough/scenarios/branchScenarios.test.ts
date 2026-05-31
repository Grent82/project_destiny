/**
 * Tests for branch playthrough scenarios (destiny-4u73.10–13)
 *
 * Economy-first, combat-first, relationship-first, and failure-path scenarios.
 * Each should run end-to-end, produce checkpoints, and maintain invariants.
 */

import { describe, it, expect } from 'vitest'
import { runScenario } from '../runner'
import { economyFirstScenario } from './economyFirst'
import { combatFirstScenario } from './combatFirst'
import { relationshipFirstScenario } from './relationshipFirst'
import { failurePathScenario } from './failurePath'

describe('Economy-first branch playthrough', () => {
  const ECON_SQUAD_NPC = 'npc-marion-vale'

  it('runs end-to-end with no failures', async () => {
    const result = await runScenario(economyFirstScenario)
    expect(result.failures, `Failures:\n${result.failures.map((f) => f.description).join('\n')}`).toHaveLength(0)
  })

  it('records consolidation and post-expedition checkpoints', async () => {
    const result = await runScenario(economyFirstScenario)
    expect(result.checkpoints).toHaveProperty('cp-econ-consolidated')
    expect(result.checkpoints).toHaveProperty('cp-econ-post-expedition')
  })

  it('NPC returns to idle after expedition', async () => {
    const result = await runScenario(economyFirstScenario)
    const post = result.checkpoints['cp-econ-post-expedition']
    expect(post?.roster.find((n) => n.npcId === ECON_SQUAD_NPC)?.assignment).toBe('idle')
  })
})

describe('Combat-first branch playthrough', () => {
  it('runs end-to-end with no failures', async () => {
    const result = await runScenario(combatFirstScenario)
    expect(result.failures, `Failures:\n${result.failures.map((f) => f.description).join('\n')}`).toHaveLength(0)
  })

  it('records in-progress and post-combat checkpoints', async () => {
    const result = await runScenario(combatFirstScenario)
    expect(result.checkpoints).toHaveProperty('cp-combat-in-progress')
    expect(result.checkpoints).toHaveProperty('cp-combat-post')
    expect(result.checkpoints).toHaveProperty('cp-combat-final')
  })

  it('activeCombat is null or concluded after combat phase', async () => {
    const result = await runScenario(combatFirstScenario)
    const post = result.checkpoints['cp-combat-post']
    // Combat is either fully concluded (null) or has a non-ongoing outcome
    const combat = post?.activeCombat
    expect(combat === null || (combat !== null && combat.outcome !== 'ongoing')).toBe(true)
  })

  it('combat-first path reaches combat earlier than golden path', async () => {
    const result = await runScenario(combatFirstScenario)
    // Combat-first: activeCombat was used on day 1 (cp-combat-in-progress before any endDay)
    const inProgress = result.checkpoints['cp-combat-in-progress']
    // The combat encounter was active on day 1 — verify checkpoint exists at day 1
    expect(inProgress?.day).toBe(1)
  })
})

describe('Relationship-first branch playthrough', () => {
  it('runs end-to-end with no failures', async () => {
    const result = await runScenario(relationshipFirstScenario)
    expect(result.failures, `Failures:\n${result.failures.map((f) => f.description).join('\n')}`).toHaveLength(0)
  })

  it('records social investment and final checkpoints', async () => {
    const result = await runScenario(relationshipFirstScenario)
    expect(result.checkpoints).toHaveProperty('cp-rel-invested')
    expect(result.checkpoints).toHaveProperty('cp-rel-final')
  })

  it('day advances during social investment period', async () => {
    const result = await runScenario(relationshipFirstScenario)
    const invested = result.checkpoints['cp-rel-invested']
    const start = result.checkpoints['cp-rel-start']
    expect(invested!.day).toBeGreaterThan(start!.day)
  })
})

describe('Failure-path branch playthrough', () => {
  it('runs end-to-end with no runtime errors', async () => {
    // Failure-path may have assertion failures — that is expected by design.
    // What must NOT happen: the runner throws or crashes.
    const result = await runScenario(failurePathScenario)
    expect(result).toBeDefined()
    expect(result.scenarioId).toBe('scenario-failure-path')
  })

  it('records checkpoints even through adverse outcomes', async () => {
    const result = await runScenario(failurePathScenario)
    expect(result.checkpoints).toHaveProperty('cp-fail-start')
    expect(result.checkpoints).toHaveProperty('cp-fail-final')
  })

  it('NPC health never drops below zero', async () => {
    const result = await runScenario(failurePathScenario)
    // Check invariant violations specifically for health
    const healthViolations = result.failures.filter((f) => f.assertionId.includes('health'))
    expect(healthViolations).toHaveLength(0)
  })

  it('starts with NPC in low health as expected', async () => {
    const result = await runScenario(failurePathScenario)
    const start = result.checkpoints['cp-fail-start']
    const npc = start?.roster.find((n) => n.npcId === 'npc-marion-vale')
    expect(npc?.states.health).toBeLessThan(50)
  })
})
