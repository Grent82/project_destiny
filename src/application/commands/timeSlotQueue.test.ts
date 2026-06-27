import { describe, it, expect, beforeEach } from 'vitest'
import { TimeSlotQueue } from './timeSlotQueue'
import type { GameState, TimeSlot, NpcIntentionType } from '../../domain'
import type { NpcDistanceResult } from './npcDistance'
import type { Rng } from './seededRng'

interface TimeSlotTask {
  taskId: string
  npcId: string
  intentionType: NpcIntentionType
  timeSlot: TimeSlot
  priority: 1 | 2 | 3 | 4 | 5
  dependencies: string[]
  handler: (state: GameState, rng: Rng) => GameState
  createdAtDay: number
}

function createMockGameState(): GameState {
  return {
    day: 1,
    rngSeed: 12345,
    timeSlot: 'morning',
    currentDistrictId: 'district-1',
    roster: [],
    activityLog: [],
    npcDistances: [],
    timeSlotState: {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    },
    factions: [],
    rumors: [],
    quests: [],
    relationships: {},
    inventory: {},
    housing: [],
    modules: [],
    titles: [],
    titlesByCharacter: {},
    titlesByNpc: {},
    titlesByFaction: {},
    titlesByDistrict: {},
    titlesByPlayer: {},
    titlesByQuest: {},
    titlesByEvent: {},
    titlesByFactionDirective: {},
    titlesByNpcAgency: {},
    titlesByPlayerAction: {},
    titlesByWorldEvent: {},
    contentCatalog: {
      npcsById: new Map(),
      itemsById: new Map(),
      factionsById: new Map(),
      districtsById: new Map(),
      questsById: new Map(),
      rumorsById: new Map(),
    },
    npcStates: [],
    householdStates: [],
    factionStates: [],
    districtStates: [],
    questStates: [],
    rumorStates: [],
    relationshipStates: {},
    inventoryState: {},
    housingState: [],
    moduleState: [],
    titleState: [],
    titleAssignments: [],
    captivityState: [],
    pregnancyState: [],
    bondingState: [],
    questLeadState: [],
    factionDirectiveState: [],
    npcAgencyState: [],
    playerActionState: [],
    worldEventState: [],
    eventStates: [],
    personalityState: [],
    pairingState: [],
    bondingPhaseState: [],
    captivityPhaseState: [],
    questsPhaseState: [],
    factionDirectivesPhaseState: [],
  } as unknown as GameState
}

function createMockTask(overrides?: Partial<TimeSlotTask>): TimeSlotTask {
  return {
    taskId: 'task-1',
    npcId: 'npc-1',
    intentionType: 'seek-work',
    timeSlot: 'morning',
    priority: 3,
    dependencies: [],
    handler: (s) => s,
    createdAtDay: 1,
    ...overrides,
  }
}

describe('TimeSlotQueue', () => {
  let queue: TimeSlotQueue

  beforeEach(() => {
    queue = new TimeSlotQueue(4)
  })

  describe('enqueue', () => {
    it('adds task to correct time slot', () => {
      const task = createMockTask({ taskId: 'task-1', timeSlot: 'morning' })
      queue.enqueue(task)

      const slots = (queue as any).slots as Map<TimeSlot, TimeSlotTask[]>
      const morningTasks = slots.get('morning')
      expect(morningTasks).toHaveLength(1)
      expect(morningTasks![0].taskId).toBe('task-1')
    })

    it('throws error for invalid time slot', () => {
      const task = createMockTask({ timeSlot: 'invalid' as TimeSlot })
      expect(() => queue.enqueue(task)).toThrow('Invalid time slot')
    })

    it('skips already completed tasks', () => {
      const task = createMockTask({ taskId: 'task-1' })
      ;(queue as any).completedTaskIds.add('task-1')
      queue.enqueue(task)

      const slots = (queue as any).slots as Map<TimeSlot, TimeSlotTask[]>
      const morningTasks = slots.get('morning')
      expect(morningTasks).toHaveLength(0)
    })

    it('sorts tasks by priority (descending)', () => {
      queue.enqueue(createMockTask({ taskId: 'task-1', priority: 2 }))
      queue.enqueue(createMockTask({ taskId: 'task-2', priority: 5 }))
      queue.enqueue(createMockTask({ taskId: 'task-3', priority: 3 }))

      const slots = (queue as any).slots as Map<TimeSlot, TimeSlotTask[]>
      const morningTasks = slots.get('morning')
      expect(morningTasks![0].priority).toBe(5)
      expect(morningTasks![1].priority).toBe(3)
      expect(morningTasks![2].priority).toBe(2)
    })
  })

  describe('processSlot', () => {
    it('processes tasks in priority order', async () => {
      const executionOrder: string[] = []

      const createHandler = (taskId: string) => (_s: GameState, _rng: Rng) => {
        executionOrder.push(taskId)
        return _s
      }

      queue.enqueue(
        createMockTask({ taskId: 'task-low', priority: 1, handler: createHandler('task-low') })
      )
      queue.enqueue(
        createMockTask({ taskId: 'task-high', priority: 5, handler: createHandler('task-high') })
      )

      const state = createMockGameState()
      const rng: Rng = () => 0.5

      await queue.processSlot('morning', state, rng)

      expect(executionOrder).toEqual(['task-high', 'task-low'])
    })

    it('respects task dependencies - skips tasks with unmet dependencies', async () => {
      const executionOrder: string[] = []

      const createHandler = (taskId: string) => (_s: GameState, _rng: Rng) => {
        executionOrder.push(taskId)
        return _s
      }

      // Task-A has no dependencies, will be processed
      const taskA: TimeSlotTask = {
        taskId: 'task-A',
        npcId: 'npc-A',
        intentionType: 'seek-work',
        timeSlot: 'morning',
        priority: 3,
        dependencies: [],
        handler: createHandler('task-A'),
        createdAtDay: 1,
      }
      // Task-B depends on task-A, but task-A is not yet completed at slot start
      // So task-B will be skipped (dependencies are checked at slot start, not during batch processing)
      const taskB: TimeSlotTask = {
        taskId: 'task-B',
        npcId: 'npc-B',
        intentionType: 'seek-work',
        timeSlot: 'morning',
        priority: 5,
        dependencies: ['task-A'],
        handler: createHandler('task-B'),
        createdAtDay: 1,
      }

      queue.enqueue(taskA)
      queue.enqueue(taskB)

      const state = createMockGameState()
      const rng: Rng = () => 0.5

      await queue.processSlot('morning', state, rng)

      // Only task-A is processed because task-B's dependency (task-A) was not
      // completed at the start of the slot. This is expected behavior - cross-task
      // dependencies within the same slot require multi-slot processing.
      expect(executionOrder).toEqual(['task-A'])
    })

    it('processes tasks when dependencies are already met', async () => {
      const executionOrder: string[] = []

      const createHandler = (taskId: string) => (_s: GameState, _rng: Rng) => {
        executionOrder.push(taskId)
        return _s
      }

      // Pre-complete task-X
      ;(queue as any).completedTaskIds.add('task-X')

      // Task-C depends on already-completed task-X
      const taskC: TimeSlotTask = {
        taskId: 'task-C',
        npcId: 'npc-C',
        intentionType: 'seek-work',
        timeSlot: 'afternoon',
        priority: 3,
        dependencies: ['task-X'],
        handler: createHandler('task-C'),
        createdAtDay: 1,
      }

      queue.enqueue(taskC)

      const state = createMockGameState()
      const rng: Rng = () => 0.5

      await queue.processSlot('afternoon', state, rng)

      expect(executionOrder).toEqual(['task-C'])
    })

    it('skips tasks with unsatisfied dependencies', async () => {
      const executionOrder: string[] = []

      const createHandler = (taskId: string) => (_s: GameState, _rng: Rng) => {
        executionOrder.push(taskId)
        return _s
      }

      queue.enqueue(
        createMockTask({ taskId: 'task-A', priority: 3, dependencies: [], handler: createHandler('task-A') })
      )
      queue.enqueue(
        createMockTask({ taskId: 'task-B', priority: 5, dependencies: ['non-existent'], handler: createHandler('task-B') })
      )

      const state = createMockGameState()
      const rng: Rng = () => 0.5

      await queue.processSlot('morning', state, rng)

      expect(executionOrder).toEqual(['task-A'])
      expect(executionOrder).not.toContain('task-B')
    })

    it('returns updated state after processing', async () => {
      const modifyState = (s: GameState, _rng: Rng): GameState => ({ ...s, day: s.day + 1 })

      queue.enqueue(createMockTask({ handler: modifyState }))

      const state = createMockGameState()
      const rng: Rng = () => 0.5

      const result = await queue.processSlot('morning', state, rng)

      expect(result.day).toBe(2)
    })
  })

  describe('createBatches', () => {
    it('separates tasks by NPC (no NPC in multiple batches)', () => {
      const tasks: TimeSlotTask[] = [
        createMockTask({ taskId: 'task-1', npcId: 'npc-A' }),
        createMockTask({ taskId: 'task-2', npcId: 'npc-B' }),
        createMockTask({ taskId: 'task-3', npcId: 'npc-A' }),
      ]

      const batches = (queue as any).createBatches(tasks) as TimeSlotTask[][]

      batches.forEach((batch) => {
        const npcIds = batch.map((t) => t.npcId)
        const uniqueNpcIds = new Set(npcIds)
        expect(npcIds.length).toBe(uniqueNpcIds.size)
      })
    })

    it('limits batches to maxConcurrentTasks', () => {
      const tasks: TimeSlotTask[] = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ taskId: `task-${i}`, npcId: `npc-${i}` })
      )

      const batches = (queue as any).createBatches(tasks) as TimeSlotTask[][]

      expect(batches.length).toBeLessThanOrEqual(4)
    })
  })

  describe('calculatePriority', () => {
    it('returns base priority for non-urgent intentions', () => {
      const priority = (queue as any).calculatePriority('medium', 'seek-work')
      expect(priority).toBe(3)
    })

    it('adds urgency bonus for urgent intentions', () => {
      const urgentIntentions = ['escape-attempt', 'seek-shelter', 'fortify-position', 'care-for-injured']

      urgentIntentions.forEach((intention) => {
        const priority = (queue as any).calculatePriority('medium', intention)
        expect(priority).toBe(4)
      })
    })

    it('caps priority at 5', () => {
      const priority = (queue as any).calculatePriority('immediate', 'escape-attempt')
      expect(priority).toBe(5)
    })

    it('returns correct base priorities for each tier', () => {
      expect((queue as any).calculatePriority('immediate', 'seek-work')).toBe(5)
      expect((queue as any).calculatePriority('high', 'seek-work')).toBe(4)
      expect((queue as any).calculatePriority('medium', 'seek-work')).toBe(3)
      expect((queue as any).calculatePriority('low', 'seek-work')).toBe(2)
      expect((queue as any).calculatePriority('background', 'seek-work')).toBe(1)
    })
  })

  describe('clear', () => {
    it('empties all time slots', () => {
      queue.enqueue(createMockTask())
      queue.clear()

      const slots = (queue as any).slots as Map<TimeSlot, TimeSlotTask[]>
      slots.forEach((tasks) => {
        expect(tasks).toHaveLength(0)
      })
    })

    it('resets completed task IDs', () => {
      queue.enqueue(createMockTask({ taskId: 'task-1' }))
      ;(queue as any).completedTaskIds.add('task-1')

      expect((queue as any).completedTaskIds.has('task-1')).toBe(true)

      queue.clear()

      expect((queue as any).completedTaskIds.has('task-1')).toBe(false)
    })
  })

  describe('hashTaskId', () => {
    it('produces deterministic hash for same task ID and seed', () => {
      const hash1 = (queue as any).hashTaskId('task-1', 12345)
      const hash2 = (queue as any).hashTaskId('task-1', 12345)
      expect(hash1).toBe(hash2)
    })

    it('produces different hash for different task IDs', () => {
      const hash1 = (queue as any).hashTaskId('task-1', 12345)
      const hash2 = (queue as any).hashTaskId('task-2', 12345)
      expect(hash1).not.toBe(hash2)
    })

    it('produces different hash for different seeds', () => {
      const hash1 = (queue as any).hashTaskId('task-1', 12345)
      const hash2 = (queue as any).hashTaskId('task-1', 67890)
      expect(hash1).not.toBe(hash2)
    })
  })
})
