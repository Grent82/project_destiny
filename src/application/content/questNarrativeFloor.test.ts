import { describe, it, expect } from 'vitest'
import { contentCatalog } from './contentCatalog'

describe('quest narrative floor', () => {
  const templates = contentCatalog.quests

  it('every quest has at least 2 midQuestBeats', () => {
    const failures = templates.filter((t) => {
      const beats = t.midQuestBeats ?? []
      return beats.length < 2
    })

    expect(failures).toHaveLength(0)
    if (failures.length > 0) {
      const details = failures.map((t) => `${t.id} has ${t.midQuestBeats?.length ?? 0} beats`).join(', ')
      console.error('Quests with <2 midQuestBeats:', details)
    }
  })

  it('every quest has non-empty aftermathText', () => {
    const failures = templates.filter((t) => {
      const aftermath = t.aftermathText
      return aftermath == null || aftermath.trim().length === 0
    })

    expect(failures).toHaveLength(0)
    if (failures.length > 0) {
      const details = failures.map((t) => t.id).join(', ')
      console.error('Quests without aftermathText:', details)
    }
  })

  it('every quest has at least one echo (successor, rumor, relationship, or city dial)', () => {
    const failures = templates.filter((t) => {
      const hasSuccessor = t.successorQuestId != null
      const hasFailSuccessor = t.successorOnFailQuestId != null
      const hasRumors = (t.successorRumorIds ?? []).length > 0
      const hasRelationships = (t.rewardRelationshipDeltas ?? []).length > 0
      const hasCityDial = t.rewardCityDialId != null

      return !hasSuccessor && !hasFailSuccessor && !hasRumors && !hasRelationships && !hasCityDial
    })

    expect(failures).toHaveLength(0)
    if (failures.length > 0) {
      const details = failures.map((t) => t.id).join(', ')
      console.error('Quests without any echo:', details)
    }
  })

  it('every quest has discoverySource and discoveryDistrictId (except successor quests unlocked via rumors)', () => {
    const failures = templates.filter((t) => {
      // Successor quests unlocked via rumors don't need discoverySource/discoveryDistrictId
      // They are discovered through the rumor consequences mechanism
      const isSuccessorQuest = t.prerequisiteQuestId != null
      if (isSuccessorQuest) return false

      return t.discoverySource == null || t.discoveryDistrictId == null
    })

    expect(failures).toHaveLength(0)
    if (failures.length > 0) {
      const details = failures.map((t) => `${t.id} (source: ${t.discoverySource}, district: ${t.discoveryDistrictId})`).join(', ')
      console.error('Quests without discoverySource or discoveryDistrictId:', details)
    }
  })

  it('every quest has sourceNpcId assigned', () => {
    const failures = templates.filter((t) => t.sourceNpcId == null)

    expect(failures).toHaveLength(0)
    if (failures.length > 0) {
      const details = failures.map((t) => t.id).join(', ')
      console.error('Quests without sourceNpcId:', details)
    }
  })
})
