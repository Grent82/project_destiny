/**
 * Tests for the first-hour funnel playthrough scenario (destiny-6vhh).
 *
 * Validates that the house-search → clue → Marion dialogue chain works
 * end-to-end at the command level. If this breaks, the core new-player
 * comprehension loop is broken.
 */

import { describe, it, expect } from 'vitest'
import { runScenario } from '../runner'
import { firstHourFunnelScenario } from './firstHourFunnel'

describe('First-Hour Funnel scenario', () => {
  it('runs end-to-end with no failures', async () => {
    const result = await runScenario(firstHourFunnelScenario)
    expect(
      result.failures,
      `Scenario failures:\n${result.failures.map((f) => f.description).join('\n')}`,
    ).toHaveLength(0)
  })

  it('records checkpoints at each funnel phase', async () => {
    const result = await runScenario(firstHourFunnelScenario)
    expect(result.checkpoints).toHaveProperty('cp-funnel-start')
    expect(result.checkpoints).toHaveProperty('cp-after-search')
    expect(result.checkpoints).toHaveProperty('cp-after-chit-dialogue')
  })

  it('grants ledger chit when bureau is searched', async () => {
    const result = await runScenario(firstHourFunnelScenario)
    const afterSearch = result.checkpoints['cp-after-search']!
    expect(afterSearch.ownedItems.some((o) => o.itemId === 'item-chit-ledger-removal')).toBe(true)
    expect(afterSearch.house.rooms.find((r) => r.roomId === 'room-bureau')?.searched).toBe(true)
  })

  it('records chit choice in resolvedDialogueChoices after the conversation', async () => {
    const result = await runScenario(firstHourFunnelScenario)
    const final = result.finalState
    const resolved = final.resolvedDialogueChoices['dialogue-marion-vale'] ?? []
    expect(resolved).toContain('marion-choice-ledger-chit')
  })

  it('maintains all invariants throughout', async () => {
    const result = await runScenario(firstHourFunnelScenario)
    expect(result.failures).toHaveLength(0)
  })
})
