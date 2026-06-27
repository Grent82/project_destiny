import { describe, expect, it } from 'vitest'

import { createEmployment } from './createEmployment'
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'

describe('createEmployment', () => {
  it('creates a new employment contract for a roster NPC', () => {
    const state = initialStateWithIda
    const params = {
      employerId: 'player',
      employerType: 'player' as const,
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout' as const,
      target: 'district-the-tangle',
      wagePerDay: 5,
      completionBonus: 50,
      deadlineDay: state.day + 3,
      description: 'Scout the tangle for resources',
    }

    const result = createEmployment(state, params)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee).toBeDefined()
    expect(employee?.currentEmployment).toBeDefined()
    expect(employee?.currentEmployment?.employmentId).toContain('employment-player')
    expect(employee?.currentEmployment?.taskType).toBe('scout')
    expect(employee?.currentEmployment?.status).toBe('pending')
    expect(employee?.currentEmployment?.wagePerDay).toBe(5)
    expect(employee?.currentEmployment?.completionBonus).toBe(50)
  })

  it('rejects employment if NPC has a faction directive', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: null,
          currentDirectiveId: 'directive-faction-123',
          directiveDeadlineDay: initialStateWithIda.day + 5,
        },
      ],
    }

    const params = {
      employerId: 'player',
      employerType: 'player' as const,
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout' as const,
      wagePerDay: 5,
      completionBonus: 0,
    }

    const result = createEmployment(state, params)

    // Employment should not be created
    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment).toBeNull()
  })

  it('rejects employment for non-existent NPC', () => {
    const state = initialStateWithIda
    const params = {
      employerId: 'player',
      employerType: 'player' as const,
      employeeId: 'non-existent-npc',
      taskType: 'scout' as const,
      wagePerDay: 5,
      completionBonus: 0,
    }

    const result = createEmployment(state, params)

    // State should be unchanged
    expect(result.roster.length).toBe(state.roster.length)
  })

  it('logs activity when employment is created', () => {
    const state = initialStateWithIda
    const params = {
      employerId: 'player',
      employerType: 'player' as const,
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'guard' as const,
      wagePerDay: 0,
      completionBonus: 0,
      description: 'Guard the house',
    }

    const result = createEmployment(state, params)

    const employmentLog = result.activityLog.find(
      (entry) => entry.message.includes('Employment created'),
    )
    expect(employmentLog).toBeDefined()
    expect(employmentLog?.message).toContain('guard')
  })

  it('clears previous employment when creating new one', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: {
            employmentId: 'employment-old-123',
            employerId: 'npc-someone',
            employerType: 'npc' as const,
            employeeId: idaRhysRosterEntry.npcId,
            taskType: 'work' as const,
            status: 'in-progress' as const,
            createdAtDay: initialStateWithIda.day - 5,
            wagePerDay: 0,
            completionBonus: 0,
            autoRenew: false,
            performanceThreshold: 50,
            poachProtection: 0,
            performanceHistory: [],
          },
        },
      ],
    }

    const params = {
      employerId: 'player',
      employerType: 'player' as const,
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout' as const,
      wagePerDay: 10,
      completionBonus: 0,
    }

    const result = createEmployment(state, params)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.employmentId).not.toBe('employment-old-123')
    expect(employee?.currentEmployment?.taskType).toBe('scout')
  })
})
