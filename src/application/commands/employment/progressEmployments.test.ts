import { describe, expect, it, beforeEach } from 'vitest'
import type { NpcRuntimeState } from '../../../domain'

import { processAllEmployments } from './progressEmployments'
import { _resetEmploymentProgressTracker } from './progressEmployment'

// Reset progress tracker before each test
beforeEach(() => {
  _resetEmploymentProgressTracker()
})
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'

describe('processAllEmployments', () => {
  it('starts all pending employments', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-start-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'pending',
      createdAtDay: 1,
    })

    const state = {
      ...initialStateWithIda,
      day: 5,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = processAllEmployments(state)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('in-progress')
    expect(employee?.currentEmployment?.startedAtDay).toBe(5)
  })

  it('progresses in-progress employments', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-progress-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'work',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
    })

    const highSkillNpc: NpcRuntimeState = {
      ...idaRhysRosterEntry,
      currentEmployment: employment,
      skills: {
        ...idaRhysRosterEntry.skills,
        administration: 100,
      },
    }

    const state = {
      ...initialStateWithIda,
      day: 5,
      rngSeed: 50, // Positive variance for consistent progress
      roster: [highSkillNpc],
    }

    // Process multiple days to simulate progress
    // With 100 skill: ~50-60% per day, need 2 days to complete
    let result = state
    for (let i = 0; i < 5; i++) {
      result = processAllEmployments(result)
      result = { ...result, day: result.day + 1, rngSeed: result.rngSeed + 10 }
    }

    // Should eventually complete with high skill
    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('completed')
  })

  it('fails employments that miss deadline', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-deadline-999',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress', // Start already in-progress to test deadline failure during progression
      createdAtDay: 1,
      startedAtDay: 1,
      deadlineDay: 3,
    })

    const state = {
      ...initialStateWithIda,
      day: 3,
      rngSeed: 0, // Negative variance for slow progress
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
          skills: {
            ...idaRhysRosterEntry.skills,
            survival: 10, // Very low skill = slow progress
          },
        },
      ],
    }

    // Process employment - should fail because deadline is met with insufficient progress
    const result = processAllEmployments(state)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    // With survival 10: progress = 10/100 * 50 + (0 % 20 - 10) = 5 - 10 = -5 -> clamped to 0
    // Progress is 0, which is < 50, and deadline is met -> should fail
    expect(employee?.currentEmployment?.status).toBe('failed')
  })

  it('handles multiple employments simultaneously', () => {
    const employment1 = npcEmploymentSchema.parse({
      employmentId: 'employment-multi-1',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'pending',
      createdAtDay: 1,
    })

    const employment2 = npcEmploymentSchema.parse({
      employmentId: 'employment-multi-2',
      employerId: 'npc-employer',
      employerType: 'npc',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'guard',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
    })

    const state = {
      ...initialStateWithIda,
      day: 2,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment1,
        },
        {
          ...idaRhysRosterEntry,
          npcId: 'npc-second',
          name: 'Second NPC',
          currentEmployment: employment2,
        },
      ],
    }

    const result = processAllEmployments(state)

    // First employment should start
    const employee1 = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee1?.currentEmployment?.status).toBe('in-progress')

    // Second employment should progress
    const employee2 = result.roster.find((npc) => npc.npcId === 'npc-second')
    expect(employee2?.currentEmployment?.status).toBe('in-progress')
  })

  it('skips NPCs without employment', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: null,
        },
      ],
    }

    const result = processAllEmployments(state)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment).toBeNull()
  })
})
