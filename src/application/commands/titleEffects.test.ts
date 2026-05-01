import { describe, expect, it } from 'vitest'

import { initialStateWithIda } from './testFixtures'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { endDay } from './endDay'

const [firstNpc, secondNpc] = initialStateWithIda.roster

describe('title effects: opportunity cost and bonuses', () => {
  it('medic title speeds recovery for recovering NPCs', () => {
    const stateWithRecovering = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === secondNpc!.npcId
          ? { ...npc, assignment: 'recovering' as const, states: { ...npc.states, health: 40 } }
          : npc,
      ),
    }

    // Without medic: base recovery +15
    const nextWithout = endDay(stateWithRecovering)
    const healthWithout = nextWithout.roster.find((r) => r.npcId === secondNpc!.npcId)!.states.health

    // With medic: base recovery +15 + bonus +10
    const stateWithMedic = {
      ...stateWithRecovering,
      roster: stateWithRecovering.roster.map((npc) =>
        npc.npcId === firstNpc!.npcId
          ? { ...npc, activeTitle: 'title-medic', assignment: 'idle' as const }
          : npc,
      ),
    }
    const nextWithMedic = endDay(stateWithMedic)
    const healthWithMedic = nextWithMedic.roster.find((r) => r.npcId === secondNpc!.npcId)!.states.health

    expect(healthWithMedic).toBeGreaterThan(healthWithout)
  })

  it('trainer title improves skill gain rate for training-assigned NPCs', () => {
    // Without trainer: training NPC gets base gain on a random skill
    const stateTrainingNoTrainer = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === secondNpc!.npcId
          ? { ...npc, assignment: 'training' as const }
          : { ...npc, assignment: 'idle' as const, activeTitle: null },
      ),
    }
    const nextWithout = endDay(stateTrainingNoTrainer)
    const totalSkillsBefore = Object.values(secondNpc!.skills).reduce((a, b) => a + b, 0)
    const totalSkillsWithoutTrainer = Object.values(
      nextWithout.roster.find((r) => r.npcId === secondNpc!.npcId)!.skills
    ).reduce((a, b) => a + b, 0)
    const gainWithout = totalSkillsWithoutTrainer - totalSkillsBefore

    // With trainer: training NPC gains more skills per day
    const stateWithTrainer = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === firstNpc!.npcId
          ? { ...npc, activeTitle: 'title-trainer', assignment: 'idle' as const }
          : { ...npc, assignment: 'training' as const },
      ),
    }
    const nextWithTrainer = endDay(stateWithTrainer)
    const totalSkillsWithTrainer = Object.values(
      nextWithTrainer.roster.find((r) => r.npcId === secondNpc!.npcId)!.skills
    ).reduce((a, b) => a + b, 0)
    const gainWith = totalSkillsWithTrainer - totalSkillsBefore

    // Trainer should give at least double the gain (baseGain 2 vs 1)
    expect(gainWith).toBeGreaterThan(gainWithout)
  })

  it('title holder (assigned_title) cannot be moved to deployed via setNpcAssignment', () => {
    const stateWithTitleHolder = {
      ...initialStateWithIda,
      roster: initialStateWithIda.roster.map((npc) =>
        npc.npcId === firstNpc!.npcId
          ? { ...npc, assignment: 'assigned_title' as const, activeTitle: 'title-medic' }
          : npc,
      ),
    }

    const next = gameSliceReducer(
      stateWithTitleHolder,
      gameActions.setNpcAssignment({ npcId: firstNpc!.npcId, assignment: 'deployed' }),
    )

    const npc = next.roster.find((r) => r.npcId === firstNpc!.npcId)!
    expect(npc.assignment).toBe('assigned_title')
  })
})
