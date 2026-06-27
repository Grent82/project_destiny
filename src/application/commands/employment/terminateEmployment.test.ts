import { describe, expect, it } from 'vitest'

import { terminateEmployment } from './terminateEmployment'
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'

describe('terminateEmployment', () => {
  it('terminates employment with employer_initiated reason', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-term-123',
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

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'employer_initiated',
      terminatingBy: 'employer',
    })

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('cancelled')
    expect(employee?.currentEmployment?.completedAtDay).toBe(state.day)
  })

  it('terminates employment with employee_resignation reason', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-resign-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'guard',
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

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'employee_resignation',
      terminatingBy: 'employee',
    })

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('cancelled')
  })

  it('logs termination activity', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-log-123',
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

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'employer_initiated',
      terminatingBy: 'employer',
    })

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('released from'),
    )
    expect(logEntry).toBeDefined()
    expect(logEntry?.message).toContain('scout')
  })

  it('does nothing if NPC has no employment', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: null,
        },
      ],
    }

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'employer_initiated',
      terminatingBy: 'employer',
    })

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment).toBeNull()
  })

  it('includes penalty note when penaltyPaid is true', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-penalty-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'protect',
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

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'employer_initiated',
      terminatingBy: 'employer',
      penaltyPaid: true,
    })

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('penalty paid'),
    )
    expect(logEntry).toBeDefined()
  })

  it('handles performance_failure termination reason', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-perf-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'negotiate',
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

    const result = terminateEmployment(state, {
      employeeId: idaRhysRosterEntry.npcId,
      terminationReason: 'performance_failure',
      terminatingBy: 'employer',
    })

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('failed to meet performance'),
    )
    expect(logEntry).toBeDefined()
  })
})
