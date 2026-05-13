/**
 * Tests for the golden-path playthrough scenario.
 *
 * This is the canonical baseline regression scenario for Project Destiny.
 * If this test breaks, core loop integrity is compromised.
 */

import { describe, it, expect } from 'vitest'
import { runScenario } from '../runner'
import { goldenPathScenario } from './goldenPath'

describe('Golden-Path scenario', () => {
  it('runs end-to-end with no failures', async () => {
    const result = await runScenario(goldenPathScenario)
    expect(result.failures, `Scenario failures:\n${result.failures.join('\n')}`).toHaveLength(0)
  })

  it('records checkpoints at each major phase', async () => {
    const result = await runScenario(goldenPathScenario)
    expect(result.checkpoints).toHaveProperty('cp-before-departure')
    expect(result.checkpoints).toHaveProperty('cp-expedition-started')
    expect(result.checkpoints).toHaveProperty('cp-expedition-returned')
    expect(result.checkpoints).toHaveProperty('cp-post-expedition')
  })

  it('leaves expedition idle and NPC idle at post-expedition checkpoint', async () => {
    const result = await runScenario(goldenPathScenario)
    const post = result.checkpoints['cp-post-expedition']
    expect(post).toBeDefined()
    expect(post!.expeditionState.status).toBe('idle')
    expect(post!.roster.find((n) => n.npcId === 'npc-marion-vale')?.assignment).toBe('idle')
  })

  it('advances the day counter during expedition resolution', async () => {
    const result = await runScenario(goldenPathScenario)
    const pre = result.checkpoints['cp-before-departure']
    const post = result.checkpoints['cp-post-expedition']
    expect(post!.day).toBeGreaterThan(pre!.day)
  })

  it('maintains all invariants throughout', async () => {
    const result = await runScenario(goldenPathScenario)
    // All failures (including invariant failures) should be empty
    expect(result.failures).toHaveLength(0)
  })
})
