import type { GameState, TimeSlot, NpcIntentionType } from '../../domain'
import type { Rng } from './seededRng'
import { createRngForTask } from './seededRng'
import type { NpcDistanceResult } from './npcDistance'
import { INTENTION_TIME_SLOT_MAPPING } from '../../domain/npc/intentionTimeSlots'
import { intentionHandlers } from './intentions'

/**
 * Ein Task in der Zeit-Slot-Queue.
 */
export interface TimeSlotTask {
  taskId: string
  npcId: string
  intentionType: NpcIntentionType
  timeSlot: TimeSlot
  priority: 1 | 2 | 3 | 4 | 5
  dependencies: string[]
  handler: (state: GameState, rng: Rng) => GameState
  createdAtDay: number
}

/**
 * Ergebnis einer Task-Verarbeitung.
 */
export interface TaskResult {
  taskId: string
  npcId: string
  status: 'completed' | 'skipped' | 'failed'
  newState: GameState
  executionTimeMs: number
}

/**
 * Zeit-Slot-Queue für asynchrone NPC-Simulation.
 *
 * Verwaltet Tasks pro Zeit-Slot, priorisiert nach Spieler-Relevanz
 * und ermöglicht deterministische parallele Verarbeitung.
 */
export class TimeSlotQueue {
  private slots: Map<TimeSlot, TimeSlotTask[]>
  private completedTaskIds: Set<string>
  private readonly maxConcurrentTasks: number

  constructor(maxConcurrentTasks: number = 4) {
    this.slots = new Map([
      ['morning', []],
      ['afternoon', []],
      ['evening', []],
      ['night', []],
    ])
    this.completedTaskIds = new Set()
    this.maxConcurrentTasks = maxConcurrentTasks
  }

  /**
   * Fuegt einen Task zur Queue hinzu.
   */
  enqueue(task: TimeSlotTask): void {
    const slotTasks = this.slots.get(task.timeSlot)
    if (!slotTasks) {
      throw new Error(`Invalid time slot: ${task.timeSlot}`)
    }

    // Pruefe auf Duplikate
    if (this.completedTaskIds.has(task.taskId)) {
      return // Already completed, skip
    }

    slotTasks.push(task)
    slotTasks.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Verarbeitet alle Tasks eines Zeit-Slots synchron.
   *
   * @param slot - Der zu verarbeitende Zeit-Slot
   * @param state - Current GameState
   * @param rng - Seeded RNG fuer Determinismus
   * @returns Updated GameState
   */
  async processSlot(
    slot: TimeSlot,
    state: GameState,
    rng: Rng
  ): Promise<GameState> {
    let next = state
    const tasks = this.slots.get(slot) || []

    // Filtere Tasks nach completed Dependencies
    const readyTasks = tasks.filter((task) =>
      task.dependencies.every((dep) => this.completedTaskIds.has(dep))
    )

    // Batch-Verarbeitung (kann zu Worker Threads erweitert werden)
    const batches = this.createBatches(readyTasks)

    for (const batch of batches) {
      next = await this.processBatch(batch, next, rng, slot)
    }

    return next
  }

  /**
   * Verarbeitet synchrone, sofortige Aktionen (Spieler-relevant).
   */
  processImmediate(
    state: GameState,
    rng: Rng,
    npcDistances: NpcDistanceResult[]
  ): GameState {
    let next = state

    const immediateNpcs = npcDistances.filter(
      (d) => d.priorityTier === 'immediate' || d.priorityTier === 'high'
    )

    for (const npcDistance of immediateNpcs) {
      // Generiere Intentionen fuer diesen NPC
      const intentions = this.generateIntentionsForNpc(
        npcDistance.npcId,
        state,
        rng
      )

      for (const intention of intentions) {
        const task: TimeSlotTask = {
          taskId: `${npcDistance.npcId}-${intention}-${state.day}`,
          npcId: npcDistance.npcId,
          intentionType: intention,
          timeSlot: state.timeSlot as TimeSlot,
          priority: 5,
          dependencies: [],
          handler: (s, r) => this.applyNpcIntention(s, npcDistance.npcId, intention, r),
          createdAtDay: state.day,
        }

        next = task.handler(next, rng)
        this.completedTaskIds.add(task.taskId)
      }
    }

    return next
  }

  /**
   * Verarbeitet asynchrone Hintergrund-Aktionen.
   */
  async processBackground(
    state: GameState,
    rng: Rng,
    npcDistances: NpcDistanceResult[]
  ): Promise<GameState> {
    let next = state

    const backgroundNpcs = npcDistances.filter(
      (d) => d.priorityTier === 'medium' || d.priorityTier === 'low' || d.priorityTier === 'background'
    )

    for (const npcDistance of backgroundNpcs) {
      const intentions = this.generateIntentionsForNpc(
        npcDistance.npcId,
        state,
        rng
      )

      for (const intention of intentions) {
        const validSlots = INTENTION_TIME_SLOT_MAPPING[intention].validTimeSlots

        for (const slot of validSlots) {
          const task: TimeSlotTask = {
            taskId: `${npcDistance.npcId}-${intention}-${slot}-${state.day}`,
            npcId: npcDistance.npcId,
            intentionType: intention,
            timeSlot: slot,
            priority: this.calculatePriority(npcDistance.priorityTier, intention),
            dependencies: [],
            handler: (s, r) => this.applyNpcIntention(s, npcDistance.npcId, intention, r),
            createdAtDay: state.day,
          }

          this.enqueue(task)
        }
      }
    }

    // Verarbeite alle Zeit-Slots sequentiell (deterministisch)
    const slots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']

    for (const slot of slots) {
      next = await this.processSlot(slot, next, rng)
    }

    return next
  }

  /**
   * Leert die Queue und resetzt den Zustand.
   */
  clear(): void {
    this.slots.forEach((tasks) => tasks.splice(0))
    this.completedTaskIds.clear()
  }

  // ─── Private Helper Methods ────────────────────────────────────────────────

  private createBatches(tasks: TimeSlotTask[]): TimeSlotTask[][] {
    const batches: TimeSlotTask[][] = []
    const usedNpcsInBatch = new Set<string>()

    for (const task of tasks) {
      // Finde ersten Batch wo dieser NPC noch nicht verwendet wurde
      let currentBatch = batches.find((batch) => !batch.some((t) => t.npcId === task.npcId))

      if (!currentBatch) {
        // Neuer Batch noetig
        currentBatch = []
        batches.push(currentBatch)
      }

      currentBatch.push(task)
      usedNpcsInBatch.add(task.npcId)
    }

    // Limitiere auf maxConcurrentTasks
    return batches.slice(0, this.maxConcurrentTasks)
  }

  private async processBatch(
    batch: TimeSlotTask[],
    state: GameState,
    _rng: Rng,
    _slot: TimeSlot,
  ): Promise<GameState> {
    void _rng // Mark as intentionally unused for now
    void _slot // Mark as intentionally unused for now
    let next = state

    for (const task of batch) {
      // Pruefe Dependencies
      const depsSatisfied = task.dependencies.every((dep) =>
        this.completedTaskIds.has(dep)
      )

      if (!depsSatisfied) {
        continue // Skip task with unsatisfied dependencies
      }

      // Erzeuge deterministischen RNG fuer diesen Task
      const taskSeed = this.hashTaskId(task.taskId, state.rngSeed)
      const taskRng = createRngForTask(taskSeed)

      try {
        next = task.handler(next, taskRng)
        this.completedTaskIds.add(task.taskId)
      } catch (error) {
        console.error(`Task ${task.taskId} failed:`, error)
        // Failed Tasks werden geloggt, State bleibt stabil
      }
    }

    return next
  }

  private generateIntentionsForNpc(
    _npcId: string,
    _state: GameState,
    _rng: Rng,
  ): NpcIntentionType[] {
    void _npcId // Mark as intentionally unused for now
    void _state // Mark as intentionally unused for now
    void _rng // Mark as intentionally unused for now
    // TODO: Intention-Generierung aus intentions/pipeline.ts
    // Fuer jetzt: leeres Array (wird spaeter implementiert)
    return []
  }

  private applyNpcIntention(
    state: GameState,
    npcId: string,
    intentionType: NpcIntentionType,
    rng: Rng,
  ): GameState {
    void rng // RNG available for future use if handler needs it
    const npc = state.roster.find((n) => n.npcId === npcId)
    if (!npc) return state

    const handler = intentionHandlers[intentionType]
    if (!handler) return state

    // Check if NPC can execute the intention (assignment check)
    if (npc.assignment !== 'idle') return state
    if (npc.currentDirectiveId !== null) return state

    return handler.execute(npc, state)
  }

  private calculatePriority(
    tier: NpcDistanceResult['priorityTier'],
    intention: NpcIntentionType
  ): 1 | 2 | 3 | 4 | 5 {
    const tierBase: Record<NpcDistanceResult['priorityTier'], 1 | 2 | 3 | 4 | 5> = {
      immediate: 5,
      high: 4,
      medium: 3,
      low: 2,
      background: 1,
    }

    // Bonus fuer dringende Intentionen
    const urgencyBonus: NpcIntentionType[] = [
      'escape-attempt',
      'seek-shelter',
      'fortify-position',
      'care-for-injured',
    ]

    const base = tierBase[tier]
    if (urgencyBonus.includes(intention)) {
      const boosted = base + 1
      return (boosted > 5 ? 5 : boosted) as 1 | 2 | 3 | 4 | 5
    }
    return base
  }

  private hashTaskId(taskId: string, seed: number): number {
    // Einfache Hash-Funktion fuer deterministischen Seed pro Task
    let hash = seed
    for (let i = 0; i < taskId.length; i++) {
      hash = Math.imul(hash ^ taskId.charCodeAt(i), 2654435761)
    }
    return hash >>> 0
  }
}

