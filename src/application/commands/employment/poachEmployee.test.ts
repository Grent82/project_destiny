import { describe, expect, it } from 'vitest'

import { poachEmployee } from './poachEmployee'
import { idaRhysRosterEntry, initialStateWithIda } from '../testFixtures'
import { npcEmploymentSchema } from '../../../domain/npc/contracts'

describe('poachEmployee', () => {
  it('fails when employee has no current employment', () => {
    const state = {
      ...initialStateWithIda,
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: null,
        },
      ],
    }

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 20,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('not currently employed')
  })

  it('fails when poacher tries to poach from themselves', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-self-123',
      employerId: 'player',
      employerType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 10,
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

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 20,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('from yourself')
  })

  it('fails when trying to poach from faction directive', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-faction-123',
      employerId: 'faction-shadowguild',
      employerType: 'faction',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 10,
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

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 50,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('faction directive')
  })

  it('successfully poaches with higher wage offer', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-poach-123',
      employerId: 'npc-old-employer',
      employerType: 'npc',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'scout',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 5,
      poachProtection: 10, // Lower protection for easier poach
    })

    // Chance calculation: 30 (base) + 40 (wage bonus) - 10 (protection) = 60%
    const state = {
      ...initialStateWithIda,
      rngSeed: 100, // Moderate roll
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 15, // 3x current wage = +40% bonus
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully poached')
    expect(result.newState).toBeDefined()
    expect(result.newEmployment).toBeDefined()
    expect(result.newEmployment?.wageOffer).toBe(15)

    // Verify employee has new employment
    const employee = result.newState?.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.employerId).toBe('player')
    expect(employee?.currentEmployment?.wagePerDay).toBe(15)
  })

  it('fails poaching when protection is too high', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-protected-123',
      employerId: 'npc-loyal-employer',
      employerType: 'npc',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'guard',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 10,
      poachProtection: 80, // Very high protection
    })

    const state = {
      ...initialStateWithIda,
      rngSeed: 50, // Medium roll
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 15, // Only +50% wage, but -80% protection
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('remained loyal')
  })

  it('succeeds with poach bonus despite high protection', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-bribe-123',
      employerId: 'npc-strict-employer',
      employerType: 'npc',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'sabotage',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 10,
      poachProtection: 40,
    })

    // Chance: 30 (base) + 20 (wage bonus: 5/10*40) - 40 (protection) + 50 (poachBonus) = 60%
    const state = {
      ...initialStateWithIda,
      rngSeed: 100, // Moderate roll
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 15,
      poachBonus: 50, // Bribe adds +50% chance
    })

    expect(result.success).toBe(true)
    expect(result.newState).toBeDefined()
  })

  it('reduces poachProtection after successful poach', () => {
    const employment = npcEmploymentSchema.parse({
      employmentId: 'employment-reduce-123',
      employerId: 'npc-employer',
      employerType: 'npc',
      employeeId: idaRhysRosterEntry.npcId,
      taskType: 'work',
      status: 'in-progress',
      createdAtDay: 1,
      startedAtDay: 1,
      wagePerDay: 5,
      poachProtection: 20,
    })

    // Chance: 30 (base) + 40 (wage bonus) - 20 (protection) = 50%
    const state = {
      ...initialStateWithIda,
      rngSeed: 100, // Moderate roll
      roster: [
        {
          ...idaRhysRosterEntry,
          currentEmployment: employment,
        },
      ],
    }

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: idaRhysRosterEntry.npcId,
      wageOffer: 10,
    })

    expect(result.success).toBe(true)

    // Check new employment has reduced protection
    const employee = result.newState?.roster.find((npc) => npc.npcId === idaRhysRosterEntry.npcId)
    expect(employee?.currentEmployment?.poachProtection).toBe(0) // 20 - 20 = 0
    expect(employee?.currentEmployment?.autoRenew).toBe(false) // Reset on poach
  })

  it('returns non-existent employee error', () => {
    const state = initialStateWithIda

    const result = poachEmployee(state, {
      poacherId: 'player',
      poacherType: 'player',
      employeeId: 'non-existent-npc',
      wageOffer: 20,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('not found')
  })
})
