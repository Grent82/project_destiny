import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit'

import type { CorridorStatus, CouncilVoteEvent, GameState } from '../../domain'
import type { Attributes, Skills, Traits } from '../../domain/npc/contracts'
import type { InstitutionalTier } from '../../domain/governance/contracts'
import { getRenownLevel } from '../../domain/progression/contracts'
import { createQuestRuntime } from '../../domain/quests/contracts'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../commands/combat'
import { purchaseItemFromShop } from '../commands/purchase'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../commands/squad'
import { endDay as endDayCommand } from '../commands/endDay'
import { recruitNpc as recruitNpcCommand, dismissNpc as dismissNpcCommand, expireHireOffers as expireHireOffersCommand } from '../commands/recruitment'
import { MAX_ACTIVITY_ENTRIES } from '../commands/activityLog'
import { applyOutcomes } from '../commands/applyEventOutcome'
import { travelToDistrict as travelToDistrictCommand } from '../commands/districtTravel'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../content/equipmentCatalog'
import { getHouseDiscovery } from '../content/houseDiscoveries'
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
    startCombatEncounter(state, action: PayloadAction<{ questId?: string } | undefined>) {
      return startCombatEncounter(state, action.payload?.questId)
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
      afterDay.isFirstRun = false
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
        if (template?.rewardStandingFactionId) {
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
          message: `Contract failed: "${template?.title ?? failed.questId}". The house bears the cost.${template?.rewardStandingFactionId && template.penaltyStandingDelta < 0 ? ` Standing with ${contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ?? template.rewardStandingFactionId} suffers.` : ''}`,
        })
      }
      if (
        !afterDay.debtPaid &&
        !afterDay.debtCrisisTriggered &&
        afterDay.day >= afterDay.debtDueDay &&
        afterDay.money < afterDay.debtAmount
      ) {
        afterDay.debtCrisisTriggered = true
        afterDay.activityLog.unshift({
          id: `log-${afterDay.day}-${afterDay.timeSlot}-debt-crisis`,
          day: afterDay.day,
          timeSlot: afterDay.timeSlot,
          category: 'system',
          message: 'The debt-claim against House Valdris has come due. The creditors have moved. The house is seized.',
        })
        if (afterDay.activityLog.length >= MAX_ACTIVITY_ENTRIES) afterDay.activityLog.pop()
      }
      return afterDay
    },

    advanceTimeSlot(state) {
      const SLOT_SEQUENCE = ['morning', 'afternoon', 'evening', 'night'] as const
      type TimeSlot = typeof SLOT_SEQUENCE[number]
      const currentIndex = SLOT_SEQUENCE.indexOf(state.timeSlot as TimeSlot)
      const nextIndex = (currentIndex + 1) % SLOT_SEQUENCE.length
      const nextSlot = SLOT_SEQUENCE[nextIndex]!

      if (nextSlot === 'morning') {
        // Crossed midnight — run full day processing via endDay
        const snapshot = current(state) as GameState
        const afterDay = endDayCommand(snapshot)
        afterDay.isFirstRun = false
        afterDay.activeQuests.forEach((q) => {
          const template = getQuestTemplates().find((t) => t.id === q.questId)
          if (template?.timeLimitDays != null && afterDay.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
          }
        })
        const failedQuests = afterDay.activeQuests.filter((q) => q.status === 'failed')
        afterDay.activeQuests = afterDay.activeQuests.filter((q) => q.status === 'active')
        for (const failed of failedQuests) {
          const template = getQuestTemplates().find((t) => t.id === failed.questId)
          if (template?.rewardStandingFactionId) {
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
            message: `Contract failed: "${template?.title ?? failed.questId}". The house bears the cost.${template?.rewardStandingFactionId && template.penaltyStandingDelta < 0 ? ` Standing with ${contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ?? template.rewardStandingFactionId} suffers.` : ''}`,
          })
        }
        if (!afterDay.debtPaid && !afterDay.debtCrisisTriggered && afterDay.day >= afterDay.debtDueDay && afterDay.money < afterDay.debtAmount) {
          afterDay.debtCrisisTriggered = true
          afterDay.activityLog.unshift({
            id: `log-${afterDay.day}-${afterDay.timeSlot}-debt-crisis`,
            day: afterDay.day,
            timeSlot: afterDay.timeSlot,
            category: 'system',
            message: 'The debt-claim against House Valdris has come due. The creditors have moved. The house is seized.',
          })
        }
        return afterDay
      }

      // Light slot advance — just move time forward
      state.timeSlot = nextSlot
      state.activityLog.unshift({
        id: `log-${state.day}-${nextSlot}-advance`,
        day: state.day,
        timeSlot: nextSlot,
        category: 'system',
        message: `${nextSlot.charAt(0).toUpperCase() + nextSlot.slice(1)} settles over Valdenmoor.`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },
    payDebt(state, action: PayloadAction<{ amount: number }>) {
      const payment = Math.max(0, action.payload.amount)
      const actualPayment = Math.min(payment, state.money)
      state.money = Math.max(0, state.money - actualPayment)
      state.debtAmount = Math.max(0, state.debtAmount - actualPayment)
      if (state.debtAmount === 0) {
        state.debtPaid = true
      }
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
      if (!template) return

      const choice = template.choices.find((c) => c.id === choiceId)
      if (!choice) return

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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      applyRelationshipDelta(state, 'player', npcId, 'respect', -5)
    },

    acceptQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      if (!state.availableQuests.includes(questId)) return
      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (!quest) return
      state.availableQuests = state.availableQuests.filter((id) => id !== questId)
      state.activeQuests.push(createQuestRuntime(quest, state.day))
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-accept-${questId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `Contract accepted: ${quest?.title ?? questId}.`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()

      if (questId === 'quest-mira-rescue' && state.mainQuest.stage === 'lead-found') {
        state.mainQuest.stage = 'location-known'
        state.mainQuest.lastClue =
          "Tessaly Ash confirms it: Mira is in the old tannery on the Pale's eastern edge. You know where she is. Now you need a way in."
      }

    },

    completeQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      const runtime = state.activeQuests[idx]
      runtime.status = 'completed'
      runtime.stageId = 'resolved'
      runtime.objectiveMet = true
      runtime.currentObjectiveLabel = 'The contract is settled. Return to house business.'
      runtime.progress.completedSteps = runtime.progress.requiredSteps
      runtime.progress.lastAdvancedDay = state.day
      runtime.journalEntries = [...runtime.journalEntries, 'The contract was resolved in the house ledger.']
      state.completedQuestIds.push(questId)
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      const questTitle = quest?.title ?? runtime.acceptedTitle
      if (quest) {
        // Corruption dial reduces quest reward payments by 10% if >= 70
        const corruption = state.cityDials.corruption
        const rewardMarks = corruption >= 70 ? Math.floor(quest.rewardMarks * 0.9) : quest.rewardMarks
        state.money += rewardMarks
        if (quest.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.min(
            100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.rewardStandingDelta,
          )
        }
        const corruptionNote = corruption >= 70 ? ' (funds skimmed by corrupt hands)' : ''

        // Side-effect logs first (pushed earlier so completion stays at top)

        // City dial consequence
        if (quest.rewardCityDialId && quest.rewardCityDialDelta !== 0) {
          const dial = quest.rewardCityDialId
          state.cityDials[dial] = Math.max(0, Math.min(100, state.cityDials[dial] + quest.rewardCityDialDelta))
          const direction = quest.rewardCityDialDelta > 0 ? 'rises' : 'falls'
          state.activityLog.unshift({
            id: `log-${state.day}-${state.timeSlot}-dial-${questId}`,
            day: state.day,
            timeSlot: state.timeSlot,
            category: 'system',
            message: `City ${dial} ${direction} in the wake of ${questTitle}.`,
          })
          if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
        }

        // Debt reduction consequence
        if (quest.rewardDebtReduction > 0) {
          state.debtAmount = Math.max(0, state.debtAmount - quest.rewardDebtReduction)
          state.activityLog.unshift({
            id: `log-${state.day}-${state.timeSlot}-debt-${questId}`,
            day: state.day,
            timeSlot: state.timeSlot,
            category: 'economy',
            message: `House debt reduced by ${quest.rewardDebtReduction} Marks — obligations clarified by ${questTitle}.`,
          })
          if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
        }

        // NPC unlock consequence — make NPC available for hire
        if (quest.unlocksNpcId) {
          const alreadyHired = state.roster.some((r) => r.npcId === quest.unlocksNpcId)
          const alreadyAvailable = state.availableForHire.some((r) => r.npcId === quest.unlocksNpcId)
          if (!alreadyHired && !alreadyAvailable) {
            const npcDefs = getNpcDefinitions()
            const npcDef = npcDefs.find((n) => n.id === quest.unlocksNpcId)
            if (npcDef) {
              state.availableForHire.push({
                npcId: npcDef.id,
                discoveredInDistrictId: quest.districtId ?? null,
                wagePerDay: 0,
                signingBonus: 0,
                requiredFactionId: null,
                requiredFactionStanding: 0,
                turnsAvailable: 10,
              })
              state.activityLog.unshift({
                id: `log-${state.day}-${state.timeSlot}-npc-${quest.unlocksNpcId}`,
                day: state.day,
                timeSlot: state.timeSlot,
                category: 'system',
                message: `${npcDef.name} is now available for house service.`,
              })
              if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
            }
          }
        }

        // Completion message at top
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-complete-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `Contract complete: ${questTitle}. ${rewardMarks} Marks received.${corruptionNote}`,
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()

        // Renown gain from quest completion — ambition trait adds +2
        const baseRenownGain = quest.riskLevel === 'extreme' ? 20 : quest.riskLevel === 'high' ? 15 : quest.riskLevel === 'medium' ? 8 : 4
        const ambitionBonus = state.playerCharacter.traits.ambition > 60 ? 2 : 0
        const renownGain = baseRenownGain + ambitionBonus
        const oldLevel = getRenownLevel(state.playerCharacter.renown)
        state.playerCharacter.renown += renownGain
        const newLevel = getRenownLevel(state.playerCharacter.renown)
        if (newLevel.level > oldLevel.level) {
          state.activityLog.unshift({
            id: `log-${state.day}-${state.timeSlot}-renown-${questId}`,
            day: state.day,
            timeSlot: state.timeSlot,
            category: 'system',
            message: `Your name carries further now. Renown rank: ${newLevel.label}.`,
          })
        }
      }

      if (questId === 'quest-mira-rescue' && state.mainQuest.stage !== 'rescued' && state.mainQuest.stage !== 'epilogue') {
        state.mainQuest.stage = 'rescued'
        state.mainQuest.lastClue =
          'Mira is back. She walks under her own strength, but whatever held her still clings to the edges of her voice.'
        state.householdLore.missingRelatives = state.householdLore.missingRelatives.filter(
          (relative) => relative.name !== 'Mira Valdris',
        )
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-mira-rescue`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: '◆ Mira is out. She is alive, and the house has changed with her return.',
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      }
    },

    resolveSimpleContract(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      const runtime = state.activeQuests[idx]
      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (!quest) return
      if (quest.objectiveType !== 'delivery' && quest.objectiveType !== 'survival') return

      runtime.status = 'completed'
      runtime.stageId = 'resolved'
      runtime.objectiveMet = true
      runtime.currentObjectiveLabel = 'The on-site work is done. Return and settle accounts.'
      runtime.progress.completedSteps = runtime.progress.requiredSteps
      runtime.progress.lastAdvancedDay = state.day
      runtime.journalEntries = [...runtime.journalEntries, 'The contract was completed on-site.']
      state.activeQuests.splice(idx, 1)
      state.completedQuestIds.push(questId)

      // Apply rewards
      state.money += quest.rewardMarks
      if (quest.rewardStandingFactionId && quest.rewardStandingDelta > 0) {
        state.factionStandings[quest.rewardStandingFactionId] = Math.min(
          100,
          (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.rewardStandingDelta,
        )
      }
      const oldRenown = state.playerCharacter.renown
      const renownGain = quest.riskLevel === 'high' ? 12 : quest.riskLevel === 'medium' ? 7 : 3
      state.playerCharacter.renown = oldRenown + renownGain

      const label = quest.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
      const factionNote = quest.rewardStandingFactionId
        ? ` Standing improved.`
        : ''
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-resolve-${questId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'economy',
        message: `${label}: "${quest.title}". ${quest.rewardMarks} Marks received. +${renownGain} Renown.${factionNote}`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    failQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      const runtime = state.activeQuests[idx]
      runtime.status = 'failed'
      runtime.stageId = 'failed'
      runtime.currentObjectiveLabel = 'The contract is lost.'
      runtime.progress.lastAdvancedDay = state.day
      runtime.journalEntries = [...runtime.journalEntries, 'The contract failed before the house could settle it.']
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      const questTitle = quest?.title ?? runtime.acceptedTitle
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
          message: `Contract failed: ${questTitle}. The house bears the cost.`,
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      }
    },

    expireTimedQuests(state) {
      const failed: string[] = []
      state.activeQuests.forEach((q) => {
        const template = getQuestTemplates().find((t) => t.id === q.questId)
        if (template?.timeLimitDays != null) {
          if (state.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
            q.stageId = 'failed'
            q.currentObjectiveLabel = 'The contract expired before the house acted.'
            q.progress.lastAdvancedDay = state.day
            q.journalEntries = [...q.journalEntries, 'Time ran out before the contract could be completed.']
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
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
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
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
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
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      } else if (tier === 'hostile') {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `The institutional arm of ${factionId} has turned against the house.`,
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()

      state.activeCouncilVotes = state.activeCouncilVotes.filter((v) => v.id !== voteId)
    },

    influenceCouncilVote(
      state,
      action: PayloadAction<{ voteId: string; stance: 'support' | 'oppose' }>,
    ) {
      const { voteId, stance } = action.payload
      const vote = state.activeCouncilVotes.find((v) => v.id === voteId)
      if (!vote || vote.outcome !== 'pending') return

      // Require either a restored ward seat or enough renown to reach the chamber through sponsors.
      const totalSeats = Object.values(state.councilSeats).reduce((sum, s) => sum + s, 0)
      const renownLevel = getRenownLevel(state.playerCharacter.renown)
      const renownSeats = renownLevel.councilSeats
      if (totalSeats === 0 && renownSeats === 0) return

      vote.playerVote = stance
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message:
          totalSeats > 0
            ? `House Valdric casts a ${stance} ward vote on "${vote.title}".`
            : `House Valdric leans on chamber sponsors to ${stance} "${vote.title}".`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    startInvestigation(state, action: PayloadAction<{ questId: string }>) {
      const quest = getQuestTemplates().find((q) => q.id === action.payload.questId)
      if (!quest || quest.objectiveType !== 'investigation') return
        state.activeInvestigation = {
          questId: action.payload.questId,
          districtId: quest.districtId,
          rollResult: 'pending',
        }
      const runtime = state.activeQuests.find((activeQuest) => activeQuest.questId === action.payload.questId)
      if (runtime) {
        runtime.stageId = 'investigating'
        runtime.currentObjectiveLabel = 'Select operatives and work the lead in the district.'
        runtime.progress.completedSteps = Math.max(runtime.progress.completedSteps, 1)
        runtime.progress.lastAdvancedDay = state.day
        runtime.journalEntries = [...runtime.journalEntries, 'The house has committed operatives to investigate the lead.']
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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      state.activeInvestigation = null
    },

    setNpcAssignment(state, action: PayloadAction<{ npcId: string; assignment: string }>) {
      const npc = state.roster.find((r) => r.npcId === action.payload.npcId)
      if (!npc) return
      if (npc.assignment === 'deployed' || npc.assignment === 'assigned_title') return
      npc.assignment = action.payload.assignment as typeof npc.assignment
    },

    setNpcTrainingFocus(state, action: PayloadAction<{ npcId: string; skill: string | null }>) {
      const npc = state.roster.find((r) => r.npcId === action.payload.npcId)
      if (!npc) return
      npc.trainingFocus = action.payload.skill
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
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    advanceExpeditionDay(state) {
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

      exp.encounters.push({
        day: exp.daysDeparted + 1,
        type: encounter.type,
        label: encounter.label,
        resolved: encounter.type !== 'combat',
      })

      exp.daysDeparted += 1

      if (wasStocked && exp.suppliesRemaining === 0) {
        // First time running out — severe penalty
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
        // Subsequent starving days — ongoing attrition
        for (const npc of state.roster) {
          if (exp.squadNpcIds.includes(npc.npcId)) {
            npc.states.health = Math.max(0, npc.states.health - 5)
            npc.states.morale = Math.max(0, npc.states.morale - 5)
          }
        }
        // Force early return if majority of squad is critically low on health
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

    equipItem(state, action: PayloadAction<{ npcId: string; slot: 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'; itemId: string | null }>) {
      const { npcId, slot, itemId } = action.payload
      const npcState = state.roster.find((n) => n.npcId === npcId)
      if (!npcState) return
      npcState.loadout[slot] = itemId
    },

    addToStash(state, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string; price: number }>) {
      const { type, id, price } = action.payload
      if (state.money < price) return
      if (type === 'weapon' && !state.stash.weapons.includes(id)) {
        state.stash.weapons.push(id)
        state.money -= price
      } else if (type === 'armor' && !state.stash.armors.includes(id)) {
        state.stash.armors.push(id)
        state.money -= price
      }
    },

    removeFromStash(state, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
      const { type, id } = action.payload
      if (type === 'weapon') {
        state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
      } else {
        state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
      }
    },

    sellFromStash(state, action: PayloadAction<{ type: 'weapon' | 'armor'; id: string }>) {
      const { type, id } = action.payload
      if (type === 'weapon') {
        if (!state.stash.weapons.includes(id)) return
        const sellPrice = Math.floor(getWeaponRepairCost(id) * 2.5) // ~50% of shop price
        state.stash.weapons = state.stash.weapons.filter((wId) => wId !== id)
        state.money += sellPrice
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-sell-${id}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `Sold weapon from stash. +${sellPrice} Marks.`,
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      } else {
        if (!state.stash.armors.includes(id)) return
        const sellPrice = Math.floor(getArmorRepairCost(id) * 2.5)
        state.stash.armors = state.stash.armors.filter((aId) => aId !== id)
        state.money += sellPrice
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-sell-${id}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `Sold armor from stash. +${sellPrice} Marks.`,
        })
        if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
      }
    },

    setPlayerCharacter(
      state,
      action: PayloadAction<{
        name: string
        backgroundId?: string
        attributes: Attributes
        skills: Skills
        traits: Traits
      }>,
    ) {
      state.playerCharacter.name = action.payload.name
      if (action.payload.backgroundId) state.playerCharacter.backgroundId = action.payload.backgroundId
      state.playerCharacter.attributes = action.payload.attributes
      state.playerCharacter.skills = action.payload.skills
      state.playerCharacter.traits = action.payload.traits
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

    startDialogue(state, action: PayloadAction<{ dialogueId: string; nodeId: string }>) {
      const { dialogueId, nodeId } = action.payload
      state.activeDialogueId = dialogueId
      // Resume from last visited node if it still exists in the tree; otherwise start from nodeId
      const lastNode = state.visitedDialogueNodes[dialogueId]
      if (lastNode) {
        const tree = contentCatalog.dialoguesById.get(dialogueId)
        const nodeExists = tree?.nodes.some((n) => n.id === lastNode) ?? false
        state.activeDialogueNodeId = nodeExists ? lastNode : nodeId
      } else {
        state.activeDialogueNodeId = nodeId
      }
    },

    advanceDialogue(state, action: PayloadAction<{ nodeId: string | null }>) {
      const { nodeId } = action.payload
      if (nodeId !== null && state.activeDialogueId) {
        state.visitedDialogueNodes[state.activeDialogueId] = nodeId
      }
      state.activeDialogueNodeId = nodeId
    },

    endDialogue(state) {
      state.activeDialogueId = null
      state.activeDialogueNodeId = null
    },

    recordMainQuestHint(state, action: PayloadAction<{ hint: string }>) {
      const { hint } = action.payload
      state.mainQuest.lastClue = hint
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-mqhint`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `◆ ${hint}`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    appendSystemLog(state, action: PayloadAction<{ message: string }>) {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-sys-${state.activityLog.length}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: action.payload.message,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    },

    repairRoom(state, action: PayloadAction<string>) {
      const room = state.house.rooms.find((r) => r.roomId === action.payload)
      if (!room) return
      if (!['damaged', 'stripped', 'collapsed', 'destroyed'].includes(room.state)) return
      if (state.money < room.repairCost) return
      state.money -= room.repairCost
      room.state = 'intact'
      room.repairCost = 0

      // Grant roster bonus for housing rooms
      const ROSTER_BONUS_BY_ROOM: Record<string, number> = {
        'room-servant-quarters': 1,
        'room-barracks': 1,
        'room-east-wing': 2,
      }
      const bonus = ROSTER_BONUS_BY_ROOM[room.roomId] ?? 0
      if (bonus > 0) {
        state.house.rosterBonus = (state.house.rosterBonus ?? 0) + bonus
      }

      const REPAIR_MESSAGES: Record<string, string> = {
        'room-bureau': `${room.name} restored. The house has a place for its accounts again.`,
        'room-kitchen': `${room.name} repaired. The smell of proper cooking returns to the house.`,
        'room-study': `${room.name} cleared and shelved. A quiet place for thought and learning.`,
        'room-master-chamber': `${room.name} restored. The lord's chamber is fit to receive again.`,
        'room-servant-quarters': `${room.name} cleared and re-fitted. The house can house ${bonus} more soul${bonus > 1 ? 's' : ''} in service.`,
        'room-barracks': `${room.name} rebuilt. Bunks and gear racks — room for ${bonus} more fighter${bonus > 1 ? 's' : ''}.`,
        'room-garret': `${room.name} shored up. The top floor breathes again.`,
        'room-east-wing': `${room.name} reclaimed at great cost. The house is whole again. ${bonus} more roster slots unlocked.`,
      }
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-repair-${room.roomId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'economy',
        message: REPAIR_MESSAGES[room.roomId] ?? `${room.name} repaired. The house reclaims another room.`,
      })
    },

    searchRoom(state, action: PayloadAction<string>) {
      const room = state.house.rooms.find((r) => r.roomId === action.payload)
      if (!room || room.searched) return
      if (room.state === 'locked' || room.state === 'collapsed' || room.state === 'destroyed') return
      room.searched = true

      const discovery = getHouseDiscovery(room.roomId, state.house.vaultUnlocked)
      if (discovery) {
        if (discovery.marks > 0) state.money += discovery.marks
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-search-${room.roomId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: discovery.message,
        })
      }

      if (room.roomId === 'room-vault' && state.house.vaultUnlocked) {
        state.mainQuest.stage = 'lead-found'
        state.mainQuest.lastClue = "A letter from Mira, hidden in the vault. She left willingly — but not freely."
      }
    },

    unlockVault(state) {
      state.house.vaultUnlocked = true
      const vault = state.house.rooms.find((r) => r.roomId === 'room-vault')
      if (vault) vault.state = 'intact'
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
