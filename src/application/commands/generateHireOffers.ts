import type { GameState, HireOffer } from '../../domain/game/contracts'
import type { NpcDefinition } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'

function calculatePrimarySkillAvg(npcDef: NpcDefinition): number {
  const values = Object.values(npcDef.startingSkills) as number[]
  if (values.length === 0) return 30
  const top3 = [...values].sort((a, b) => b - a).slice(0, 3)
  return top3.reduce((sum, v) => sum + v, 0) / top3.length
}

export function generateDistrictHireOffers(state: GameState, districtId: string): void {
  const alreadyHired = new Set(state.roster.map((r) => r.npcId))
  const alreadyOffered = new Set(state.availableForHire.map((o) => o.npcId))

  const district = contentCatalog.districtsById.get(districtId)
  const controllingFactionId = district?.controllingFactionId ?? null
  const dangerLevel = district?.dangerLevel ?? 3

  for (const npcDef of contentCatalog.npcs) {
    if (alreadyHired.has(npcDef.id) || alreadyOffered.has(npcDef.id)) continue

    const matchesFaction = npcDef.factionAffinityId === controllingFactionId && controllingFactionId !== null
    const isIndependent = !npcDef.factionAffinityId
    const randomAppearance = Math.random() < 0.1

    if (!matchesFaction && !isIndependent && !randomAppearance) continue

    if (npcDef.factionAffinityId) {
      const standing = state.factionStandings[npcDef.factionAffinityId] ?? 0
      if (standing < -20) continue
    }

    // Independent NPCs only appear in lower-danger districts unless random
    if (isIndependent && dangerLevel > 3 && !randomAppearance) continue

    const primarySkillAvg = calculatePrimarySkillAvg(npcDef)
    const wagePerDay = Math.max(3, Math.min(20, Math.floor(primarySkillAvg / 5)))
    const signingBonus = wagePerDay * 3

    const offer: HireOffer = {
      npcId: npcDef.id,
      discoveredInDistrictId: districtId,
      wagePerDay,
      signingBonus,
      requiredFactionId: npcDef.factionAffinityId ?? null,
      requiredFactionStanding: npcDef.factionAffinityId ? -20 : 0,
      turnsAvailable: 4,
    }

    state.availableForHire.push(offer)
  }
}
