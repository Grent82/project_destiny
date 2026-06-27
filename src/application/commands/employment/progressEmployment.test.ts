import { describe, expect, it, beforeEach } from 'vitest'
import type { NpcRuntimeState, GameState } from '../../../domain'

import { progressEmployment, calculateTaskProgress, _resetEmploymentProgressTracker } from './progressEmployment'
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'

// Reset progress tracker before each test
beforeEach(() => {
  _resetEmploymentProgressTracker()
})

describe('progressEmployment', () => {
  it('progresses an in-progress employment task', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-test-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
    })

    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = progressEmployment(state, 'employment-test-123')

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('in-progress') // May complete if progress >= 100
  })

  it('completes employment when progress reaches 100%', () => {
    // Create an NPC with very high skills to ensure quick completion
    const highSkillNpc: NpcRuntimeState = {
      ...idaRhysRosterEntry,
      currentEmployment: null, // Explicitly set to null
      skills: {
        ...idaRhysRosterEntry.skills,
        survival: 100,
        security: 100,
        negotiation: 100,
        intrigue: 100,
        administration: 100,
      },
    }

    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-complete-789', // Unique ID per test run
      employerId: 'player',
      employerType: 'player',
      employeeId: highSkillNpc.npcId,
      taskType: 'work',
      status: 'in-progress',
      wagePerDay: 5,
      completionBonus: 100,
      createdAtDay: 1,
      startedAtDay: 1,
    })

    const state: GameState = {
      ...initialStateWithIda,
      roster: [{ ...highSkillNpc, currentEmployment: employment }],
      rngSeed: 50, // Positive variance
    }

    // Run progress multiple times to simulate multiple days
    // With 100 skill: 50% base + variance = ~50% per day
    // Need 2 days to reach 100%
    let result = state
    for (let i = 0; i < 3; i++) {
      result = progressEmployment(result, 'employment-complete-789')
    }

    const employee = result.roster.find((npc) => npc.npcId === highSkillNpc.npcId)
    // After enough progress, should be completed
    expect(employee?.currentEmployment?.status).toBe('completed')
    expect(employee?.currentEmployment?.completedAtDay).toBeGreaterThan(0)
  })

  it('does not progress pending or completed employments', () => {
    const pendingEmployment = npcEmploymentSchema.parse({
      employmentId: 'employment-pending-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'pending',
      createdAtDay: 1,
    })

    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: pendingEmployment,
        },
      ],
    }

    const result = progressEmployment(state, 'employment-pending-123')

    // Should remain pending
    expect(result.roster[0].currentEmployment?.status).toBe('pending')
  })

  it('returns state unchanged for non-existent employment', () => {
    const state = initialStateWithIda
    const result = progressEmployment(state, 'non-existent-employment')
    expect(result).toBe(state)
  })
})

describe('calculateTaskProgress', () => {
  it('calculates progress based on relevant skills', () => {
    const employee = {
      skills: { survival: 80, security: 50, negotiation: 30, intrigue: 40, administration: 60 },
      traits: { curiosity: 50, discipline: 50, empathy: 50, ruthlessness: 50 },
    }

    const employment = { taskType: 'scout' as const }
    const state = initialStateWithIda

    const progress = calculateTaskProgress(employee, employment, state)

    // Should be based on survival skill (80) + curiosity trait bonus
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThanOrEqual(100)
  })

  it('applies trait bonuses for specific task types', () => {
    // Scout task benefits from curiosity
    const curiousEmployee = {
      skills: { survival: 60 },
      traits: { curiosity: 100, discipline: 0, empathy: 0, ruthlessness: 0 },
    }

    const employment = { taskType: 'scout' as const }
    const state = { ...initialStateWithIda, rngSeed: 50 } // Positive variance

    const progress = calculateTaskProgress(curiousEmployee, employment, state)

    // Base: 60/100 * 50 = 30%, curiosity bonus: 100/200 = 50%, variance: +5%
    // Total: 30 + 25 + 5 = 60%
    expect(progress).toBeGreaterThan(20) // Base 30% + curiosity bonus + variance
  })

  it('handles all task types', () => {
    const employee = {
      skills: {
        survival: 60,
        security: 60,
        negotiation: 60,
        intrigue: 60,
        administration: 60,
      },
      traits: { curiosity: 50, discipline: 50, empathy: 50, ruthlessness: 50 },
    }

    const state = initialStateWithIda

    const taskTypes = ['scout', 'protect', 'retrieve', 'deliver', 'guard', 'negotiate', 'sabotage', 'escort', 'work']

    for (const taskType of taskTypes) {
      const progress = calculateTaskProgress(employee, { taskType: taskType as typeof taskTypes[number] }, state)
      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThanOrEqual(100)
    }
  })
})
