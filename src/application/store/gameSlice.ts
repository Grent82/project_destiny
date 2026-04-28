import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit'

import type { CorridorStatus, CouncilVoteEvent, GameState } from '../../domain'
import type { InstitutionalTier } from '../../domain/governance/contracts'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../commands/combat'
import { purchaseItemFromShop } from '../commands/purchase'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../commands/squad'
import { endDay as endDayCommand } from '../commands/endDay'
import { recruitNpc as recruitNpcCommand, dismissNpc as dismissNpcCommand, expireHireOffers as expireHireOffersCommand } from '../commands/recruitment'
import { applyOutcomes } from '../commands/applyEventOutcome'
import { travelToDistrict as travelToDistrictCommand } from '../commands/districtTravel'
import { evaluateEvents } from '../commands/evaluateEvents'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../content/equipmentCatalog'
import { contentCatalog, getQuestTemplates, getNpcDefinitions } from '../content/contentCatalog'
import { initialGameStateSnapshot } from './initialGameState'
import { applyRelationshipDelta } from '../commands/adjustRelationship'
import {
  generateExpeditionEncounter,
  rollDiscovery,
  applyExpeditionDiscoveries,
} from '../commands/expedition'

const gameSlice = createSlice({
  name: 'game',
  initialState: initialGameStateSnapshot,
  reducers: {
    addNpcToSelectedSquad(state, action: PayloadAction<string>) {
      return addNpcToSelectedSquad(state, action.payload)
    },
    removeNpcFromSelectedSquad(state, action: PayloadAction<string>) {
      return removeNpcFromSelectedSquad(state, action.payload)
    },
    purchaseItemFromShop(
      state,
      action: PayloadAction<{ shopId: string; itemId: string }>,
    ) {
      return purchaseItemFromShop(
        state,
        action.payload.shopId,
        action.payload.itemId,
      )
    },
    startCombatEncounter(state) {
      return startCombatEncounter(state)
    },
    performCombatAction(
      state,
      action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
    ) {
      return performCombatAction(state, action.payload)
    },
    concludeCombatEncounter(state) {
      return concludeCombatEncounter(state)
    },
    endDay(state) {
      const afterDay = endDayCommand(state)
      // Expire timed quests at end of day
      afterDay.activeQuests.forEach((q) => {
        const template = getQuestTemplates().find((t) => t.id === q.questId)
        if (template?.timeLimitDays != null) {
          if (afterDay.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
          }
        }
      })
      const failedQuests = afterDay.activeQuests.filter((q) => q.status === 'failed')
      afterDay.activeQuests = afterDay.activeQuests.filter((q) => q.status === 'active')
      for (const failed of failedQuests) {
        const template = getQuestTemplates().find((t) => t.id === failed.questId)
        if (template?.rewardStandingFactionId && afterDay.factionStandings[template.rewardStandingFactionId] !== undefined) {
          afterDay.factionStandings[template.rewardStandingFactionId] = Math.max(
            -100,
            (afterDay.factionStandings[template.rewardStandingFactionId] ?? 0) + template.penaltyStandingDelta,
          )
        }
        afterDay.activityLog.unshift({
          id: `log-${afterDay.day}-${afterDay.timeSlot}-quest-expire-${failed.questId}`,
          day: afterDay.day,
          timeSlot: afterDay.timeSlot,
          category: 'system',
          message: `Contract failed: ${template?.title ?? failed.questId}. The house bears the cost.`,
        })
      }
      return afterDay
    },
    recruitNpc(state, action: PayloadAction<{ npcId: string }>) {
      const nextState = recruitNpcCommand(state, action.payload.npcId)
      // Trust gain: they chose to join
      applyRelationshipDelta(nextState, 'player', action.payload.npcId, 'trust', 5)
      return nextState
    },
    dismissNpc(state, action: PayloadAction<{ npcId: string }>) {
      return dismissNpcCommand(state, action.payload.npcId)
    },
    expireHireOffers(state) {
      return expireHireOffersCommand(state)
    },
    adjustCityResource(
      state,
      action: PayloadAction<{
        resource: 'foodSecurity' | 'waterAccess' | 'materialStock'
        delta: number
      }>,
    ) {
      const { resource, delta } = action.payload
      state.cityResources[resource] = Math.max(
        0,
        Math.min(100, state.cityResources[resource] + delta),
      )
    },
    setCorridorStatus(state, action: PayloadAction<CorridorStatus>) {
      state.cityResources.corridorStatus = action.payload
    },
    replaceGameState(_state, action: PayloadAction<GameState>) {
      return action.payload
    },
    setProtagonistName(state, action: PayloadAction<string>) {
      state.protagonistName = action.payload
    },
    setHasSeenOpening(state, action: PayloadAction<boolean>) {
      state.hasSeenOpening = action.payload
    },
    selectMission(state, action: PayloadAction<string | null>) {
      state.activeMissionId = action.payload
    },
    adjustFactionStanding(
      state,
      action: PayloadAction<{ factionId: string; delta: number }>,
    ) {
      const { factionId, delta } = action.payload
      const current = state.factionStandings[factionId] ?? 0
      state.factionStandings[factionId] = Math.max(-100, Math.min(100, current + delta))

      if (delta < -10) {
        state.roster.forEach((rosterNpc) => {
          const npcDef = getNpcDefinitions().find((n) => n.id === rosterNpc.npcId)
          if (npcDef?.factionAffinityId === factionId) {
            rosterNpc.traits.loyalty = Math.max(0, (rosterNpc.traits.loyalty ?? 50) - 5)
            if (rosterNpc.traits.loyalty < 30) {
              state.activityLog.unshift({
                id: `log-faction-loyalty-${rosterNpc.npcId}-${state.day}`,
                day: state.day,
                timeSlot: state.timeSlot,
                category: 'system',
                message: `${npcDef.name} takes notice of what was done to their people.`,
              })
            }
          }
        })
      }
    },
    adjustCityDial(
      state,
      action: PayloadAction<{
        dial: 'control' | 'prosperity' | 'unrest' | 'corruption'
        delta: number
      }>,
    ) {
      const { dial, delta } = action.payload
      state.cityDials[dial] = Math.max(0, Math.min(100, state.cityDials[dial] + delta))
    },
    resolveEvent(state, action: PayloadAction<{ eventId: string; choiceId: string }>) {
      const { eventId, choiceId } = action.payload
      const template = contentCatalog.eventsById.get(eventId)
      if (!template) return state

      const choice = template.choices.find((c) => c.id === choiceId)
      if (!choice) return state

      const next = { ...state, pendingEvents: state.pendingEvents.filter((e) => e.eventId !== eventId) }
      return applyOutcomes(next, choice.outcomes)
    },
    travelToDistrict(state, action: PayloadAction<string>) {
      return travelToDistrictCommand(state, action.payload)
    },
    assignTitle(state, action: PayloadAction<{ npcId: string; titleId: string }>) {
      const { npcId, titleId } = action.payload
      const npc = state.roster.find((r) => r.npcId === npcId)
      if (!npc) return
      npc.activeTitle = titleId
      const roleLabel = titleId.replace('title-', '').replace('-', ' ')
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `A title conferred. The house has a new ${roleLabel}.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
      applyRelationshipDelta(state, 'player', npcId, 'respect', 8)
    },
    revokeTitle(state, action: PayloadAction<{ npcId: string }>) {
      const { npcId } = action.payload
      const npc = state.roster.find((r) => r.npcId === npcId)
      if (!npc) return
      npc.activeTitle = null
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `The title is revoked. The role sits empty.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
      applyRelationshipDelta(state, 'player', npcId, 'respect', -5)
    },

    acceptQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      if (!state.availableQuests.includes(questId)) return
      state.availableQuests = state.availableQuests.filter((id) => id !== questId)
      state.activeQuests.push({ questId, acceptedOnDay: state.day, status: 'active', objectiveMet: false })
      const quest = getQuestTemplates().find((q) => q.id === questId)
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-accept-${questId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `Contract accepted: ${quest?.title ?? questId}.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()

      const snapshot = current(state)
      const updated = evaluateEvents(snapshot)
      state.pendingEvents = updated.pendingEvents
      state.firedEventIds = updated.firedEventIds
    },

    completeQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      state.activeQuests[idx].status = 'completed'
      state.activeQuests[idx].objectiveMet = true
      state.completedQuestIds.push(questId)
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (quest) {
        state.money += quest.rewardMarks
        if (quest.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.min(
            100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.rewardStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-complete-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `Contract complete: ${quest.title}. ${quest.rewardMarks} Marks received.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    failQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      state.activeQuests[idx].status = 'failed'
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (quest) {
        if (quest.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.max(
            -100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.penaltyStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-fail-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `Contract failed: ${quest.title}. The house bears the cost.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    expireTimedQuests(state) {
      const failed: string[] = []
      state.activeQuests.forEach((q) => {
        const template = getQuestTemplates().find((t) => t.id === q.questId)
        if (template?.timeLimitDays != null) {
          if (state.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
            failed.push(q.questId)
          }
        }
      })
      state.activeQuests = state.activeQuests.filter((q) => q.status === 'active')
      for (const questId of failed) {
        const quest = getQuestTemplates().find((t) => t.id === questId)
        if (quest?.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.max(
            -100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.penaltyStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-expire-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `Contract failed: ${quest?.title ?? questId}. The house bears the cost.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },
    adjustRelationship(
      state,
      action: PayloadAction<{
        fromId: string
        toId: string
        axis: 'affinity' | 'respect' | 'fear' | 'trust' | 'loyalty'
        delta: number
        reason?: string
      }>,
    ) {
      const { fromId, toId, axis, delta, reason } = action.payload
      const result = applyRelationshipDelta(state, fromId, toId, axis, delta)
      if (result.significant && reason) {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-rel-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: reason,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    setInstitutionalStanding(
      state,
      action: PayloadAction<{ factionId: string; tier: InstitutionalTier }>,
    ) {
      const { factionId, tier } = action.payload
      state.institutionalStanding[factionId] = tier
      if (tier === 'blacklisted') {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `House Valdric has been blacklisted by ${factionId}. Enforcement will follow.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      } else if (tier === 'hostile') {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `The institutional arm of ${factionId} has turned against the house.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    addCouncilVote(state, action: PayloadAction<CouncilVoteEvent>) {
      state.activeCouncilVotes.push(action.payload)
    },

    resolveCouncilVote(
      state,
      action: PayloadAction<{ voteId: string; playerInfluenced: boolean; passes: boolean }>,
    ) {
      const { voteId, passes } = action.payload
      const vote = state.activeCouncilVotes.find((v) => v.id === voteId)
      if (!vote) return

      vote.outcome = passes ? 'passed' : 'failed'

      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `Council vote: "${vote.title}" — ${passes ? 'passed' : 'failed'}.${passes ? ` ${vote.effect}` : ''}`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()

      state.activeCouncilVotes = state.activeCouncilVotes.filter((v) => v.id !== voteId)
    },

    repairItem(state, action: PayloadAction<{ npcId: string; slot: 'weapon' | 'armor' }>) {
      const { npcId, slot } = action.payload
      const npc = state.roster.find((r) => r.npcId === npcId)
      if (!npc) return

      const itemId = slot === 'weapon' ? npc.loadout.primaryWeaponId : npc.loadout.armorId
      if (!itemId) return

      const baseRepairCost = slot === 'weapon'
        ? getWeaponRepairCost(itemId)
        : getArmorRepairCost(itemId)

      const hasQuartermaster = state.roster.some((r) => r.activeTitle === 'title-quartermaster')
      const repairDiscount = hasQuartermaster ? 0.8 : 1.0
      const finalRepairCost = Math.floor(baseRepairCost * repairDiscount)

      if (state.money < finalRepairCost) return

      const durabilityMax = slot === 'weapon'
        ? getWeaponDurabilityMax(itemId)
        : getArmorDurabilityMax(itemId)

      state.money -= finalRepairCost

      if (!state.equippedItemDurabilities[npcId]) {
        state.equippedItemDurabilities[npcId] = {} as Record<'weapon' | 'armor', number>
      }
      state.equippedItemDurabilities[npcId]![slot] = durabilityMax

      const logId = `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`
      state.activityLog.unshift({
        id: logId,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'economy',
        message: `Equipment repaired. Cost: ${finalRepairCost} Marks.${hasQuartermaster ? ' (Quartermaster discount applied)' : ''}`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
    },

    startInvestigation(state, action: PayloadAction<{ questId: string }>) {
      const quest = getQuestTemplates().find((q) => q.id === action.payload.questId)
      if (!quest || quest.objectiveType !== 'investigation') return
      state.activeInvestigation = {
        questId: action.payload.questId,
        districtId: quest.districtId,
        rollResult: 'pending',
      }
    },

    resolveInvestigation(state, action: PayloadAction<{ npcIds: string[] }>) {
      if (!state.activeInvestigation) return
      const { questId } = state.activeInvestigation
      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (!quest) return

      const investigationSkills = ['intrigue', 'security', 'administration', 'negotiation'] as const

      let bestSkillValue = 0
      action.payload.npcIds.forEach((npcId) => {
        const rosterNpc = state.roster.find((r) => r.npcId === npcId)
        if (!rosterNpc) return
        investigationSkills.forEach((skill) => {
          const val = rosterNpc.skills[skill] ?? 0
          if (val > bestSkillValue) bestSkillValue = val
        })
      })

      const difficulty = 55
      const roll = Math.random() * 100
      const effectiveRoll = roll + (bestSkillValue - difficulty)

      let result: 'success' | 'partial' | 'failure'
      if (effectiveRoll >= 20) result = 'success'
      else if (effectiveRoll >= 0) result = 'partial'
      else result = 'failure'

      state.activeInvestigation.rollResult = result

      if (result === 'success') {
        state.money += quest.rewardMarks
        if (quest.rewardStandingFactionId) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.min(
            100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.rewardStandingDelta,
          )
        }
        state.completedQuestIds.push(questId)
        state.activeQuests = state.activeQuests.filter((q) => q.questId !== questId)
        state.activityLog.unshift({
          id: `log-inv-success-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `The investigation concludes. ${quest.rewardMarks} Marks received.`,
        })
      } else if (result === 'partial') {
        const halfReward = Math.floor(quest.rewardMarks / 2)
        state.money += halfReward
        state.completedQuestIds.push(questId)
        state.activeQuests = state.activeQuests.filter((q) => q.questId !== questId)
        state.activityLog.unshift({
          id: `log-inv-partial-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `The investigation yields something, though not everything. ${halfReward} Marks.`,
        })
      } else {
        if (quest.rewardStandingFactionId) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.max(
            -100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.penaltyStandingDelta,
          )
        }
        state.activeQuests = state.activeQuests.filter((q) => q.questId !== questId)
        state.activityLog.unshift({
          id: `log-inv-fail-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `The investigation goes nowhere. The opportunity is lost.`,
        })
      }
      if (state.activityLog.length > 100) state.activityLog.pop()
      state.activeInvestigation = null
    },

    setNpcAssignment(state, action: PayloadAction<{ npcId: string; assignment: string }>) {
      const npc = state.roster.find((r) => r.npcId === action.payload.npcId)
      if (!npc) return
      if (npc.assignment === 'deployed' || npc.assignment === 'assigned_title') return
      npc.assignment = action.payload.assignment as typeof npc.assignment
    },

    startExpedition(
      state,
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

      for (const npc of state.roster) {
        if (squadNpcIds.includes(npc.npcId)) {
          npc.assignment = 'deployed'
        }
      }

      state.cityResources.foodSecurity = Math.max(
        0,
        (state.cityResources.foodSecurity ?? 0) - supplies,
      )

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
      if (state.activityLog.length > 100) state.activityLog.pop()
    },

    advanceExpeditionDay(state) {
      const exp = state.expeditionState
      if (!exp || exp.status !== 'traveling') return

      const destination = contentCatalog.expeditionDestinationsById.get(exp.destinationId ?? '')
      if (!destination) return

      const consumed = destination.supplyConsumptionPerDay
      exp.suppliesRemaining = Math.max(0, exp.suppliesRemaining - consumed)

      const r1 = Math.random()
      const encounter = generateExpeditionEncounter(exp.daysDeparted + 1, destination.dangerLevel, r1)

      if (encounter.type === 'discovery') {
        const r2 = Math.random()
        const discovery = rollDiscovery(destination.discoveryTable, r2)
        if (discovery) exp.discoveries.push(discovery)
      }

      exp.encounters.push({
        day: exp.daysDeparted + 1,
        type: encounter.type,
        label: encounter.label,
        resolved: encounter.type !== 'combat',
      })

      exp.daysDeparted += 1

      if (exp.suppliesRemaining === 0) {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-exp-no-supplies`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: 'Supplies exhausted on expedition. The squad presses on — barely.',
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
        for (const npc of state.roster) {
          if (exp.squadNpcIds.includes(npc.npcId)) {
            npc.states.health = Math.max(0, npc.states.health - 10)
            npc.states.morale = Math.max(0, npc.states.morale - 15)
          }
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
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    resolveExpedition(state) {
      const exp = state.expeditionState
      if (!exp || exp.status !== 'returned') return

      const snapshot = current(state) as GameState

      // Apply discoveries and then tick city for each expedition day
      let nextState = applyExpeditionDiscoveries(snapshot, exp.discoveries)

      const daysToProcess = Math.min(exp.daysDeparted, 10)
      for (let i = 0; i < daysToProcess; i++) {
        nextState = endDayCommand(nextState)
      }

      // Return deployed squad NPCs to idle
      nextState = {
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

      return nextState
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
