import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import { endDay, wageForStatus } from './endDay'

describe('wageForStatus', () => {
  it('returns correct wages for each status', () => {
    expect(wageForStatus('retainer')).toBe(4)
    expect(wageForStatus('mercenary')).toBe(8)
    expect(wageForStatus('citizen')).toBe(5)
    expect(wageForStatus('servant')).toBe(2)
    expect(wageForStatus('apprentice')).toBe(3)
    expect(wageForStatus('noble')).toBe(14)
    expect(wageForStatus('criminal')).toBe(5)
    expect(wageForStatus('prisoner')).toBe(0)
    expect(wageForStatus('family')).toBe(0)
  })
})

describe('endDay', () => {
  // Marion Vale: retainer (4 Marks), Ida Rhys: hired mercenary contract (12 Marks)
  // Total daily wage: 16 Marks — uses initialStateWithIda (Ida hired)
  // House baseline income: +5 Marks/day (Step 4d)
  it('wage deduction reduces credits by the combined daily wage', () => {
    const stateNoWorking = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) => ({ ...npc, assignment: 'idle' as const })),
    }
    const next = endDay(stateNoWorking)
    expect(next.money).toBe(stateNoWorking.money - 16 + 5)
  })

  it('hunger rises by 8 each day for non-deployed NPCs', () => {
    const next = endDay(initialGameStateSnapshot)
    const marionBefore = initialGameStateSnapshot.roster.find((r) => r.npcId === 'npc-marion-vale')!
    const marionAfter = next.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(marionAfter.states.hunger).toBe(Math.min(100, marionBefore.states.hunger + 8))
  })

  it('fatigue decreases for resting NPCs', () => {
    const next = endDay(initialStateWithIda)
    const idaBefore = initialStateWithIda.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    const idaAfter = next.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    // idle => resting => fatigue -10
    expect(idaAfter.states.fatigue).toBe(Math.max(0, idaBefore.states.fatigue - 10))
  })

  it('medic title heals the most injured NPC by 8 health', () => {
    const stateWithMedic = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-medic' } : npc,
      ),
    }
    const next = endDay(stateWithMedic)
    // Ida Rhys has health 91 (lower than Marion's 96), so she gets healed
    const idaAfter = next.roster.find((r) => r.npcId === 'npc-ida-rhys')!
    expect(idaAfter.states.health).toBe(99) // 91 + 8
  })

  it('steward title adds skill-scaled Marks to credits after wage deduction', () => {
    const stateWithSteward = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale' ? { ...npc, activeTitle: 'title-steward', assignment: 'idle' as const } : { ...npc, assignment: 'idle' as const },
      ),
    }
    const next = endDay(stateWithSteward)
    // Marion's administration is 61, so steward income = 15 + floor((61-45)/10)*2 = 17
    // money - 16 wages + 17 steward + 5 house baseline income
    expect(next.money).toBe(stateWithSteward.money - 16 + 17 + 5)
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
    // Marion (retainer) costs 4M/day — use 3M to trigger "draws no wages" warning
    const brokeState = { ...initialGameStateSnapshot, money: 3 }
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
    const stateWithTrainer = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? { ...npc, activeTitle: 'title-trainer', assignment: 'idle' as const }
          : npc,
      ),
    }

    const next = endDay(stateWithTrainer)

    // Verify training occurred — log entry should mention "ran drills"
    const trainerLog = next.activityLog.find((e) => e.message.includes('ran drills'))
    expect(trainerLog).toBeDefined()

    // At least one NPC should have a higher total skill sum than before
    const totalSkillsBefore = stateWithTrainer.roster.reduce(
      (sum, npc) => sum + Object.values(npc.skills).reduce((a, b) => a + b, 0),
      0,
    )
    const totalSkillsAfter = next.roster.reduce(
      (sum, npc) => sum + Object.values(npc.skills).reduce((a, b) => a + b, 0),
      0,
    )
    expect(totalSkillsAfter).toBeGreaterThan(totalSkillsBefore)
  })

  it('council vote fires every 5 days when no active vote is present', () => {
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
    // event-rumor-ledger-keeper: dayMin=1, probability=1 — always fires deterministically.
    // It is isAutoResolved=true so it is consumed by resolveRumorEvents in the same endDay
    // cycle; check the activity log for the resolved message instead of pendingEvents.
    const state = {
      ...initialGameStateSnapshot,
      day: 1,
      pendingEvents: [],
      lastFiredDay: {},
    }
    const next = endDay(state)
    const hasRumorEntry = next.activityLog.some((e) => e.message.includes('ledger-keeper'))
    expect(hasRumorEntry).toBe(true)
  })

  it('nudges the player back toward Tessaly without passively creating Mira rescue work', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 11,
      mainQuest: {
        stage: 'lead-found' as const,
        lastClue: 'The vault letter points toward Tessaly Ash.',
      },
      availableQuestLeads: [],
    }

    const next = endDay(state)

    expect(next.mainQuest.stage).toBe('lead-found')
    expect(next.availableQuestLeads.some((lead) => lead.questId === 'quest-mira-rescue')).toBe(false)
    expect(next.activityLog.some((entry) => entry.message.includes('Tessaly Ash'))).toBe(true)
  })

  it('does not auto-rescue Mira from passive politics or elapsed days', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 19,
      mainQuest: {
        stage: 'location-known' as const,
        lastClue: 'You know where Mira is held.',
      },
      completedQuestIds: ['quest-harborwatch', 'quest-ledger-recovery', 'quest-restored-appeal'],
    }

    const next = endDay(state)

    expect(next.mainQuest.stage).toBe('location-known')
    expect(next.activityLog.some((entry) => entry.message.includes('Mira is still inside the Pale tannery'))).toBe(true)
  })

  it('does not auto-advance Mira into the epilogue after rescue', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 24,
      mainQuest: {
        stage: 'rescued' as const,
        lastClue: 'Mira is back at the house.',
      },
    }

    const next = endDay(state)

    expect(next.mainQuest.stage).toBe('rescued')
  })

  it('keeps a fresh-save endDay event burst within the day-one budget', () => {
    const state = {
      ...initialGameStateSnapshot,
      day: 1,
      isFirstRun: false,
      pendingEvents: [],
      lastFiredDay: {},
    }

    const next = endDay(state)

    expect(next.pendingEvents.length).toBeLessThanOrEqual(10)
  })

  it('city dial: high unrest (>=70) decays all NPC loyalty by 1 and logs a message', () => {
    const state = {
      ...initialStateWithIda,
      cityDials: { control: 45, prosperity: 45, unrest: 75, corruption: 30 },
    }
    const marionBefore = state.roster.find((r) => r.npcId === 'npc-marion-vale')!
    const next = endDay(state)
    const marionAfter = next.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(marionAfter.traits.loyalty).toBeLessThan(marionBefore.traits.loyalty)
    expect(next.activityLog.some((e) => e.message.includes('Unrest in the city'))).toBe(true)
  })

  it('city dial: low unrest (<70) does not add unrest loyalty decay', () => {
    const state = {
      ...initialStateWithIda,
      cityDials: { control: 45, prosperity: 45, unrest: 55, corruption: 30 },
    }
    const marionBefore = state.roster.find((r) => r.npcId === 'npc-marion-vale')!
    const next = endDay(state)
    const marionAfter = next.roster.find((r) => r.npcId === 'npc-marion-vale')!
    expect(next.activityLog.some((e) => e.message.includes('Unrest in the city'))).toBe(false)
    // Loyalty should not have extra decay (Marion has wages paid, so no unpaid decay either)
    expect(marionAfter.traits.loyalty).toBe(marionBefore.traits.loyalty)
  })

  it('city dial: high prosperity (>=60) boosts working NPC income by 10%', () => {
    const workingState = {
      ...initialStateWithIda,
      cityDials: { control: 45, prosperity: 65, unrest: 40, corruption: 30 },
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-ida-rhys' ? { ...npc, assignment: 'working' as const } : { ...npc, assignment: 'idle' as const },
      ),
    }
    const next = endDay(workingState)
    // Ida's best skill drives income; with prosperity >=60 the base income gets *1.1
    expect(next.money).toBeGreaterThan(workingState.money - 16 + 5) // wages out, base income in, plus boosted working income
  })

  it('city dial: low prosperity (<=30) reduces working NPC income by 10%', () => {
    const baseState = {
      ...initialStateWithIda,
      cityDials: { control: 45, prosperity: 45, unrest: 40, corruption: 30 },
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === 'npc-ida-rhys' ? { ...npc, assignment: 'working' as const } : { ...npc, assignment: 'idle' as const },
      ),
    }
    const lowProsperityState = {
      ...baseState,
      cityDials: { control: 45, prosperity: 25, unrest: 40, corruption: 30 },
    }
    const nextBase = endDay(baseState)
    const nextLow = endDay(lowProsperityState)
    expect(nextLow.money).toBeLessThanOrEqual(nextBase.money)
  })
})
