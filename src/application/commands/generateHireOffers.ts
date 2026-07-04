import type { GameState, HireOffer } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import type { Rng } from './seededRng'
import { calculateMercenaryContractWage } from './wageRates'
import { hasIntactHouseRoomFunction } from './houseRoomFunctions'

function computeReputationScore(state: GameState): number {
  const standingScore = Object.values(state.factionStandings).reduce(
    (sum, s) => sum + Math.max(0, s),
    0
  )
  const questScore = (state.completedQuestIds?.length ?? 0) * 15
  const dayScore = Math.min(state.day * 2, 60)
  return Math.min(200, standingScore + questScore + dayScore)
}

export function generateDistrictHireOffers(
  state: GameState,
  districtId: string,
  reputationScore: number = computeReputationScore(state),
  rng: Rng = Math.random,
): void {
  const alreadyHired = new Set(state.npcRuntimeStates.map((r) => r.npcId))
  const alreadyOffered = new Set(state.availableForHire.map((o) => o.npcId))

  const district = contentCatalog.districtsById.get(districtId)
  const controllingFactionId = district?.controllingFactionId ?? null
  const dangerLevel = district?.dangerLevel ?? 3
  const hasReception = hasIntactHouseRoomFunction(state, 'reception')

  // Pool size scales with reputation: 2 base, up to 6 at score 160+
  const poolSize = 2 + Math.floor(reputationScore / 40) + (hasReception ? 1 : 0)
  // Higher reputation unlocks NPCs with higher base loyalty trait
  const minLoyalty = reputationScore >= 100 ? 60 : 0

  let addedCount = 0

  for (const npcDef of contentCatalog.npcs) {
    if (addedCount >= poolSize) break
    if ((npcDef.npcType ?? 'roster') !== 'roster') continue
    if (alreadyHired.has(npcDef.id) || alreadyOffered.has(npcDef.id)) continue

    const matchesFaction = npcDef.factionAffinityId === controllingFactionId && controllingFactionId !== null
    const isIndependent = !npcDef.factionAffinityId
    const randomAppearance = rng() < 0.1

    if (!matchesFaction && !isIndependent && !randomAppearance) continue

    if (npcDef.factionAffinityId) {
      const standing = state.factionStandings[npcDef.factionAffinityId] ?? 0
      if (standing < -20) continue
    }

    // Independent NPCs only appear in lower-danger districts unless random
    if (isIndependent && dangerLevel > 3 && !randomAppearance) continue

    // At high reputation, filter out low-loyalty candidates
    if ((npcDef.startingTraits?.loyalty ?? 50) < minLoyalty) continue

    const wagePerDay = calculateMercenaryContractWage(npcDef.startingSkills)
    const signingBonus = wagePerDay * 3

    const offer: HireOffer = {
      npcId: npcDef.id,
      discoveredInDistrictId: districtId,
      wagePerDay,
      signingBonus,
      requiredFactionId: npcDef.factionAffinityId ?? null,
      requiredFactionStanding: npcDef.factionAffinityId ? -20 : 0,
      turnsAvailable: hasReception ? 6 : 4,
    }

    state.availableForHire.push(offer)
    addedCount++
  }
}
