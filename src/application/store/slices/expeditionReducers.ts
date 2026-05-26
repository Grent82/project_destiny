import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import { contentCatalog } from '../../content/contentCatalog'
import { applyExpeditionDiscoveries, generateExpeditionEncounter, rollDiscovery } from '../../commands/expedition'
import { endDay as endDayCommand } from '../../commands/endDay'
import { EXPEDITION_CARRY_LIMITS } from '../../selectors/expeditionCarry'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

export const expeditionReducers = {
  startExpedition(
    state: GameState,
    action: PayloadAction<{
      destinationId: string
      squadNpcIds: string[]
      supplies: number
    }>,
  ) {
    const { destinationId, squadNpcIds, supplies } = action.payload
    const destination = contentCatalog.expeditionDestinationsById.get(destinationId)
    if (!destination) return
    if (squadNpcIds.length === 0) return
    if ((state.cityResources?.foodSecurity ?? 0) < supplies) return

    const missionItems = state.ownedItems.filter((i) => i.location === 'mission_pack')
    const categoryCounts: Record<string, number> = {}
    for (const item of missionItems) {
      const def = contentCatalog.itemsById.get(item.itemId)
      const cat = def?.category ?? 'other'
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + item.quantity
    }
    const isOverLimit = Object.entries(categoryCounts).some(([cat, count]) => {
      const key = cat as keyof typeof EXPEDITION_CARRY_LIMITS
      const limit = EXPEDITION_CARRY_LIMITS[key]
      return limit !== null && count > limit
    })
    if (isOverLimit) return

    for (const npc of state.roster) {
      if (squadNpcIds.includes(npc.npcId)) npc.assignment = 'deployed'
    }
    state.cityResources.foodSecurity = Math.max(0, (state.cityResources.foodSecurity ?? 0) - supplies)
    state.expeditionState = {
      status: 'traveling',
      destinationId,
      squadNpcIds,
      suppliesRemaining: supplies,
      daysDeparted: 0,
      totalDays: destination.durationDays,
      encounters: [],
      discoveries: [],
      cityDayAtDeparture: state.day,
    }
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-expedition-depart`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `Expedition departed for ${destination.name}. ${squadNpcIds.length} operative${squadNpcIds.length !== 1 ? 's' : ''}. ${supplies} supplies allocated.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  advanceExpeditionDay(state: GameState) {
    const exp = state.expeditionState
    if (!exp || exp.status !== 'traveling') return

    const destination = contentCatalog.expeditionDestinationsById.get(exp.destinationId ?? '')
    if (!destination) return

    const consumed = destination.supplyConsumptionPerDay
    const wasStocked = exp.suppliesRemaining > 0
    exp.suppliesRemaining = Math.max(0, exp.suppliesRemaining - consumed)

    const r1 = Math.random()
    const encounter = generateExpeditionEncounter(exp.daysDeparted + 1, destination.dangerLevel, r1)

    if (encounter.type === 'discovery') {
      const r2 = Math.random()
      const discovery = rollDiscovery(destination.discoveryTable, r2)
      if (discovery) exp.discoveries.push(discovery)
    }

    if (encounter.type === 'combat') {
      const squadNpcs = state.roster.filter((n) => exp.squadNpcIds.includes(n.npcId))
      if (squadNpcs.length > 0) {
        const target = squadNpcs[Math.floor(Math.random() * squadNpcs.length)]!
        target.states.health = Math.max(0, target.states.health - 15)
        target.states.injury = Math.min(100, target.states.injury + 10)
        const healInstanceId = target.loadout.consumableIds
          .map((id) => state.ownedItems.find((o) => o.instanceId === id))
          .filter(Boolean)
          .find((inst) => {
            const def = contentCatalog.itemsById.get(inst!.itemId)
            return def?.typedEffects?.some((e) => e.type === 'heal') ?? false
          })
        if (healInstanceId) {
          const def = contentCatalog.itemsById.get(healInstanceId.itemId)!
          state.pendingConsumableDecision = {
            npcId: target.npcId,
            npcName: target.name,
            instanceId: healInstanceId.instanceId,
            itemName: def.name,
            injuryContext: encounter.label,
          }
        }
      }
    }

    exp.encounters.push({
      day: exp.daysDeparted + 1,
      type: encounter.type,
      label: encounter.label,
      resolved: true,
    })
    exp.daysDeparted += 1

    if (wasStocked && exp.suppliesRemaining === 0) {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-exp-no-supplies`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: 'Supplies exhausted. The squad forages, but their strength fades.',
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      for (const npc of state.roster) {
        if (exp.squadNpcIds.includes(npc.npcId)) {
          npc.states.health = Math.max(0, npc.states.health - 10)
          npc.states.morale = Math.max(0, npc.states.morale - 15)
        }
      }
    } else if (!wasStocked && exp.suppliesRemaining === 0) {
      for (const npc of state.roster) {
        if (exp.squadNpcIds.includes(npc.npcId)) {
          npc.states.health = Math.max(0, npc.states.health - 5)
          npc.states.morale = Math.max(0, npc.states.morale - 5)
        }
      }
      const squadNpcs = state.roster.filter((n) => exp.squadNpcIds.includes(n.npcId))
      const criticalCount = squadNpcs.filter((n) => n.states.health < 20).length
      if (criticalCount >= Math.ceil(squadNpcs.length / 2)) {
        exp.status = 'returned'
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-exp-retreat`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: 'The squad cannot continue. Starving and broken, they turn back early.',
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      }
    }

    if (exp.daysDeparted >= exp.totalDays) {
      exp.status = 'returned'
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-exp-returned`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `The expedition returns from ${destination.name}.`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    }
  },

  resolveExpedition(state: GameState) {
    const exp = state.expeditionState
    if (!exp || exp.status !== 'returned') return

    const snapshot = current(state) as GameState
    let nextState = applyExpeditionDiscoveries(snapshot, exp.discoveries)

    const daysToProcess = Math.min(exp.daysDeparted, 10)
    for (let i = 0; i < daysToProcess; i++) {
      nextState = endDayCommand(nextState)
    }

    return {
      ...nextState,
      roster: nextState.roster.map((npc) => {
        if (exp.squadNpcIds.includes(npc.npcId) && npc.assignment === 'deployed') {
          return { ...npc, assignment: 'idle' as const }
        }
        return npc
      }),
      expeditionState: {
        status: 'idle' as const,
        destinationId: null,
        squadNpcIds: [],
        suppliesRemaining: 0,
        daysDeparted: 0,
        totalDays: 0,
        encounters: [],
        discoveries: [],
        cityDayAtDeparture: 0,
      },
    }
  },

  resolveConsumableUse(state: GameState) {
    const decision = state.pendingConsumableDecision
    if (!decision) return
    const { npcId, instanceId, itemName, npcName } = decision
    const instance = state.ownedItems.find((o) => o.instanceId === instanceId)
    if (!instance) { state.pendingConsumableDecision = null; return }
    const def = contentCatalog.itemsById.get(instance.itemId)
    const healEffect = def?.typedEffects?.find((e) => e.type === 'heal')
    const healValue = typeof healEffect?.value === 'number' ? healEffect.value : 0
    const npc = state.roster.find((n) => n.npcId === npcId)
    if (npc) {
      npc.states.health = Math.min(100, npc.states.health + healValue)
      npc.states.injury = Math.max(0, npc.states.injury - Math.floor(healValue / 2))
    }
    state.ownedItems = state.ownedItems.filter((o) => o.instanceId !== instanceId)
    if (npc) {
      npc.loadout.consumableIds = npc.loadout.consumableIds.filter((id) => id !== instanceId)
    }
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-consumable-used`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `You used the ${itemName} on ${npcName}. The wound was tended. +${healValue} health.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    state.pendingConsumableDecision = null
  },

  skipConsumableUse(state: GameState) {
    const decision = state.pendingConsumableDecision
    if (!decision) return
    const { npcName, itemName } = decision
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-consumable-saved`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `You kept the ${itemName}. ${npcName}'s wound tightened overnight.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    state.pendingConsumableDecision = null
  },
}
