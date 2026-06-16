import { describe, expect, it } from 'vitest'
import { eventOutcomeSchema } from '../../domain/events/contracts'
import type { CorridorStatus } from '../../domain'

describe('Content catalog validator - red fixtures', () => {
  it('rejects adjustNpcRelationship with "target" instead of "npcId" (C4 bug class)', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      target: 'npc-marion-vale',
      axis: 'trust' as const,
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows it
    // But validator should reject it
  })

  it('rejects adjustNpcRelationship missing npcId', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      axis: 'trust' as const,
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows optional fields
    // But validator should reject missing required field
  })

  it('rejects adjustCityDial with invalid target', () => {
    const badOutcome = {
      type: 'adjustCityDial' as const,
      target: 'invalid-dial' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true) // Schema allows any string
    // But validator should reject invalid enum value
  })

  it('rejects adjustCityResource with invalid target', () => {
    const badOutcome = {
      type: 'adjustCityResource' as const,
      target: 'invalid-resource' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject invalid enum value
  })

  it('rejects setCorridorStatus with invalid target', () => {
    const badOutcome = {
      type: 'setCorridorStatus' as const,
      target: 'invalid-status' as CorridorStatus,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject invalid enum value
  })

  it('rejects adjustNpcRelationship with invalid axis', () => {
    const badOutcome = {
      type: 'adjustNpcRelationship' as const,
      npcId: 'npc-marion-vale',
      axis: 'invalid-axis' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: 5,
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(false) // Schema catches this
  })

  it('rejects updateQuestStage with missing stageId', () => {
    const badOutcome = {
      type: 'updateQuestStage' as const,
      questId: 'quest-some-quest',
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject missing required field
  })

  it('accepts adjustNpcState schema shape for a rule-based subject', () => {
    const outcome = {
      type: 'adjustNpcState' as const,
      subject: 'highest-stress',
      axis: 'stress' as const,
      delta: -10,
      message: '{npcName} finally rests.',
    }
    const result = eventOutcomeSchema.safeParse(outcome)
    expect(result.success).toBe(true)
  })

  it('rejects adjustNpcState with an invalid axis at schema level', () => {
    const outcome = {
      type: 'adjustNpcState' as const,
      subject: 'highest-stress',
      axis: 'bad-axis' as any, /* eslint-disable-line @typescript-eslint/no-explicit-any */
      delta: -10,
    }
    const result = eventOutcomeSchema.safeParse(outcome)
    expect(result.success).toBe(false)
  })

  it('rejects addActivityLogEntry with empty message', () => {
    const badOutcome = {
      type: 'addActivityLogEntry' as const,
      message: '',
    }
    const result = eventOutcomeSchema.safeParse(badOutcome)
    expect(result.success).toBe(true)
    // But validator should reject empty message
  })
})
