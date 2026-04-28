import { describe, expect, it, vi } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { endDay, wageForStatus } from './endDay'

describe('wageForStatus', () => {
  it('returns correct wages for each status', () => {
    expect(wageForStatus('retainer')).toBe(6)
    expect(wageForStatus('mercenary')).toBe(12)
    expect(wageForStatus('citizen')).toBe(8)
    expect(wageForStatus('servant')).toBe(3)
    expect(wageForStatus('apprentice')).toBe(4)
    expect(wageForStatus('noble')).toBe(20)
    expect(wageForStatus('criminal')).toBe(8)
    expect(wageForStatus('prisoner')).toBe(0)
    expect(wageForStatus('family')).toBe(0)
  })
})

describe('endDay', () => {
  // Marion Vale: retainer (6 Marks), Ida Rhys: mercenary (12 Marks)
  // Total daily wage: 18 Marks
  it('wage deduction reduces credits by the combined daily wage', () => {
    const next = endDay(initialGameStateSnapshot)
    expect(next.money).toBe(initialGameStateSnapshot.money - 18)
  })

  it('hunger rises by 8 each day for non-deployed NPCs', () => {
    const next = endDay(initialGameStateSnapshot)
    const marionBefore = initialGameStateSnapshot.roster.find((r) => r.npcId === 'npc-marion-vale')!
    const marionAfter = next.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(marionAfter.states.hunger).toBe(Math.min(100, marionBefore.states.hunger + 8))
  })

  it('fatigue decreases for resting NPCs', () => {
    const next = endDay(initialGameStateSnapshot)
    const idaBefore = initialGameStateSnapshot.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    const idaAfter = next.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    // idle => resting => fatigue -10
    expect(idaAfter.states.fatigue).toBe(Math.max(0, idaBefore.states.fatigue - 10))
  })

  it('medic title heals the most injured NPC by 8 health', () => {
    const stateWithMedic = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-medic' } : npc,
      ),
    }
    const next = endDay(stateWithMedic)
    // Ida Rhys has health 91 (lower than Marion's 96), so she gets healed
    const idaAfter = next.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(idaAfter.states.health).toBe(99) // 91 + 8
  })

  it('steward title adds 15 Marks to credits after wage deduction', () => {
    const stateWithSteward = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward' } : npc,
      ),
    }
    const next = endDay(stateWithSteward)
    // 300 - 18 wages + 15 steward = 297
    expect(next.money).toBe(initialGameStateSnapshot.money - 18 + 15)
  })

  it('day counter increments by 1', () => {
    const next = endDay(initialGameStateSnapshot)
    expect(next.day).toBe(initialGameStateSnapshot.day + 1)
  })

  it('resets timeSlot to morning after end of day', () => {
    const afternoonState = { ...initialGameStateSnapshot, timeSlot: 'afternoon' as const }
    const next = endDay(afternoonState)
    expect(next.timeSlot).toBe('morning')
  })

  it('logs a day-separator entry in the activity log', () => {
    const next = endDay(initialGameStateSnapshot)
    const dayEntry = next.activityLog.find((e) => e.message.includes('Day 2'))
    expect(dayEntry).toBeDefined()
    expect(dayEntry?.category).toBe('system')
  })

  it('logs a warning when credits are insufficient for wages', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 5 }
    const next = endDay(brokeState)
    const warning = next.activityLog.find((e) => e.message.includes('draws no wages'))
    expect(warning).toBeDefined()
  })

  it('increments wagesOwedDays when credits cannot cover wage', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 0 }
    const next = endDay(brokeState)
    const npcWithDebt = next.roster.find((r) => r.wagesOwedDays > 0)
    expect(npcWithDebt).toBeDefined()
  })

  it('trainer title trains a random idle NPC on a random skill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const stateWithTrainer = {
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, activeTitle: 'title-trainer', assignment: 'idle' as const }
          : npc,
      ),
    }

    const next = endDay(stateWithTrainer)

    // With Math.random=0: first idle NPC (Ida Rhys) receives +1 in first skill (melee)
    const idaAfter = next.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    const idaBefore = stateWithTrainer.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(idaAfter.skills.melee).toBe(Math.min(100, idaBefore.skills.melee + 1))
    const trainerLog = next.activityLog.find((e) => e.message.includes('ran drills'))
    expect(trainerLog).toBeDefined()

    vi.restoreAllMocks()
  })

  it('council vote fires every 5 days when no active vote is present', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    // day 4 → endDay → day 5 → 5 % 5 === 0 triggers vote
    const state = {
      ...initialGameStateSnapshot,
      day: 4,
      activeCouncilVotes: [],
    }
    const next = endDay(state)
    expect(next.activeCouncilVotes.length).toBeGreaterThan(0)
    const logEntry = next.activityLog.find((e) => e.message.includes('vote is called'))
    expect(logEntry).toBeDefined()

    vi.restoreAllMocks()
  })

  it('does not crash when roster is empty', () => {
    const emptyRosterState = {
      ...initialGameStateSnapshot,
      roster: [],
      selectedSquadNpcIds: [],
    }
    expect(() => endDay(emptyRosterState)).not.toThrow()
    const next = endDay(emptyRosterState)
    expect(next.day).toBe(initialGameStateSnapshot.day + 1)
  })

  it('evaluateEvents: fires pending events when conditions are met after endDay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // probability check always passes

    const state = {
      ...initialGameStateSnapshot,
      cityDials: { control: 50, prosperity: 50, unrest: 70, corruption: 20 },
      pendingEvents: [],
    }
    const next = endDay(state)
    expect(next.pendingEvents.length).toBeGreaterThan(0)

    vi.restoreAllMocks()
  })
})
