import { describe, expect, it } from 'vitest'

import { completeEmployment, failEmployment, cancelEmployment } from './completeEmployment'
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'

describe('completeEmployment', () => {
  it('marks employment as completed', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-complete-123',
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

    const result = completeEmployment(state, idaRhysRosterEntry.npcId)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('completed')
    expect(employee?.currentEmployment?.completedAtDay).toBe(state.day)
  })

  it('pays completion bonus to NPC personal funds', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-bonus-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress',
      completionBonus: 100,
      createdAtDay: 1,
      startedAtDay: 1,
    })

    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
          personalFunds: {
            savings: 50,
            carriedCash: 10,
            lastWagePaymentDay: null,
            lastTipAmount: 0,
          },
        },
      ],
    }

    const result = completeEmployment(state, idaRhysRosterEntry.npcId)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.personalFunds.savings).toBe(150) // 50 + 100 bonus
  })

  it('logs completion activity', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-log-123',
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

    const result = completeEmployment(state, idaRhysRosterEntry.npcId)

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Employment completed'),
    )
    expect(logEntry).toBeDefined()
    expect(logEntry?.message).toContain('guard')
  })
})

describe('failEmployment', () => {
  it('marks employment as failed with reason', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-fail-123',
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

    const result = failEmployment(state, idaRhysRosterEntry.npcId, 'deadline_missed')

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('failed')
    expect(employee?.currentEmployment?.completedAtDay).toBe(state.day)
  })

  it('logs failure activity', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-fail-log-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'sabotage',
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

    const result = failEmployment(state, idaRhysRosterEntry.npcId, 'target_evaded')

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Employment failed'),
    )
    expect(logEntry).toBeDefined()
    expect(logEntry?.message).toContain('target_evaded')
  })
})

describe('cancelEmployment', () => {
  it('marks employment as cancelled', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-cancel-123',
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
          currentEmployment: employment,
        },
      ],
    }

    const result = cancelEmployment(state, idaRhysRosterEntry.npcId)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.status).toBe('cancelled')
    expect(employee?.currentEmployment?.completedAtDay).toBe(state.day)
  })

  it('does nothing if NPC has no employment', () => {
    // Create state with NPC that explicitly has null employment
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: null,
        },
      ],
    }
    const result = cancelEmployment(state, idaRhysRosterEntry.npcId)

    const employee = result.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    // State should be unchanged
    expect(employee?.currentEmployment).toBeNull()
  })
})
