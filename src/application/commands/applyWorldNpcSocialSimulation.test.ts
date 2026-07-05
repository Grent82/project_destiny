import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyWorldNpcSocialSimulation } from './applyWorldNpcSocialSimulation'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

function makeState() {
  return {
    ...initialGameStateSnapshot,
    relationships: {},
    bondVisibility: {},
  }
}

describe('applyWorldNpcSocialSimulation', () => {
  it('forms soft bonds for same-district world NPCs and skips cross-district pairs', () => {
    const result = applyWorldNpcSocialSimulation(makeState(), () => 0)

    const paleKey = buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')
    const crossDistrictKey = buildRelationshipKey('npc-garet-doyle', 'npc-old-maret')

    expect(result.relationships[paleKey]?.softBond).toBeDefined()
    expect(result.relationships[paleKey]?.softBond?.strength).toBeGreaterThan(0)
    expect(result.relationships[crossDistrictKey]).toBeUndefined()
  })

  it('enforces the soft-bond cap by displacing the weakest edge', () => {
    const worldNpcIds = contentCatalog.npcs
      .filter((npc) => npc.npcType === 'world')
      .map((npc) => npc.id)
      .filter((npcId) => npcId !== 'npc-garet-doyle')
      .slice(0, 5)

    const state = makeState()
    state.relationships = worldNpcIds.reduce((relationships, npcId, index) => {
      const forward = buildRelationshipKey('npc-garet-doyle', npcId)
      const reverse = buildRelationshipKey(npcId, 'npc-garet-doyle')
      return {
        ...relationships,
        [forward]: {
          affinity: 10,
          respect: 0,
          fear: 0,
          trust: 10,
          loyalty: 0,
          bondType: 'friendship',
          softBond: { strength: 12 + index, since: 1 + index, visibility: 'hidden' as const },
        },
        [reverse]: {
          affinity: 10,
          respect: 0,
          fear: 0,
          trust: 10,
          loyalty: 0,
          bondType: 'friendship',
          softBond: { strength: 12 + index, since: 1 + index, visibility: 'hidden' as const },
        },
      }
    }, {})

    const result = applyWorldNpcSocialSimulation(state, () => 0)
    const outgoingKeys = Object.keys(result.relationships).filter(
      (key) => key.startsWith('npc-garet-doyle-to-') && result.relationships[key]?.softBond,
    )
    const survivingSeededTargets = worldNpcIds.filter(
      (npcId) => result.relationships[buildRelationshipKey('npc-garet-doyle', npcId)],
    )

    expect(outgoingKeys).toHaveLength(5)
    expect(survivingSeededTargets.length).toBeLessThan(worldNpcIds.length)
    expect(result.relationships[buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')]?.softBond)
      .toBeDefined()
  })

  it('does not promote romance while the soft-bond strength is below the threshold', () => {
    const key = buildRelationshipKey('npc-garet-doyle', 'npc-sister-vael')
    const reverse = buildRelationshipKey('npc-sister-vael', 'npc-garet-doyle')
    const state = makeState()
    state.relationships = {
      [key]: {
        affinity: 32,
        respect: 0,
        fear: 0,
        trust: 36,
        loyalty: 6,
        bondType: 'friendship',
        softBond: { strength: 44, since: 2, visibility: 'rumored' },
      },
      [reverse]: {
        affinity: 32,
        respect: 0,
        fear: 0,
        trust: 36,
        loyalty: 6,
        bondType: 'friendship',
        softBond: { strength: 44, since: 2, visibility: 'rumored' },
      },
    }

    const result = applyWorldNpcSocialSimulation(state, () => 0.99)

    expect(result.relationships[key]?.bondType).toBe('friendship')
    expect(result.relationships[key]?.intimacyStage ?? 'none').toBe('none')
  })

  it('turns strong asymmetrical ties into patronage with persistent world-npc flags and rumors', () => {
    const key = buildRelationshipKey('npc-orven-pell', 'npc-alis-vey')
    const reverse = buildRelationshipKey('npc-alis-vey', 'npc-orven-pell')
    const state = makeState()
    state.relationships = {
      [key]: {
        affinity: 48,
        respect: 30,
        fear: 0,
        trust: 52,
        loyalty: 22,
        bondType: 'friendship',
        softBond: { strength: 72, since: 2, visibility: 'known' },
      },
      [reverse]: {
        affinity: 40,
        respect: 25,
        fear: 0,
        trust: 50,
        loyalty: 66,
        bondType: 'friendship',
        softBond: { strength: 72, since: 2, visibility: 'known' },
      },
    }

    const result = applyWorldNpcSocialSimulation(state, () => 0)
    const patron = result.npcRuntimeStates.find((entry) => entry.npcId === 'npc-orven-pell')
    const client = result.npcRuntimeStates.find((entry) => entry.npcId === 'npc-alis-vey')

    expect(result.relationships[key]?.bondType).toBe('patronage')
    expect(result.relationships[reverse]?.bondType).toBe('dependency')
    expect(patron?.flags).toContain('patron-of:npc-alis-vey')
    expect(client?.flags).toContain('patronized-by:npc-orven-pell')
    expect(result.rumors.some((rumor) => rumor.eventSource === 'world-npc-patronage:npc-orven-pell:npc-alis-vey')).toBe(true)
  })

  it('lets protective world NPCs intervene in captivity outcomes for allied non-player actors', () => {
    const key = buildRelationshipKey('npc-old-maret', 'npc-orren-wex')
    const reverse = buildRelationshipKey('npc-orren-wex', 'npc-old-maret')
    const state = makeState()
    state.relationships = {
      [key]: {
        affinity: 44,
        respect: 18,
        fear: 0,
        trust: 58,
        loyalty: 55,
        bondType: 'protective',
        softBond: { strength: 74, since: 3, visibility: 'known' },
      },
      [reverse]: {
        affinity: 36,
        respect: 22,
        fear: 0,
        trust: 54,
        loyalty: 68,
        bondType: 'dependency',
        softBond: { strength: 74, since: 3, visibility: 'known' },
      },
    }
    state.npcCaptivityStates = {
      'npc-orren-wex': {
        status: 'captive',
        condition: 'hurt',
        compliance: 'resistant',
        bondType: 'fear',
        regime: 'penal',
        holderId: 'faction-civic-compact',
        siteId: 'site-poi-hollows-detention-house',
        roomId: null,
        timeHeldDays: 4,
        lastTransferDay: 1,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] }
      },
    }

    const result = applyWorldNpcSocialSimulation(state, () => 0)
    const captivity = result.npcCaptivityStates['npc-orren-wex']
    const protector = result.npcRuntimeStates.find((entry) => entry.npcId === 'npc-old-maret')

    expect(captivity?.condition).toBe('healthy')
    expect(captivity?.bondType).toBe('dependency')
    expect(protector?.flags).toContain('protecting:npc-orren-wex')
    expect(result.rumors.some((rumor) => rumor.eventSource === 'world-npc-protection:npc-old-maret:npc-orren-wex')).toBe(true)
  })

  it('escalates entrenched rivalries into feuds that raise district pressure', () => {
    const key = buildRelationshipKey('npc-torvald-messe', 'npc-lira-ashcroft')
    const reverse = buildRelationshipKey('npc-lira-ashcroft', 'npc-torvald-messe')
    const state = makeState()
    state.relationships = {
      [key]: {
        affinity: -10,
        respect: -6,
        fear: 12,
        trust: -8,
        loyalty: 0,
        bondType: 'rivalry',
        softBond: { strength: 78, since: 2, visibility: 'rumored' },
      },
      [reverse]: {
        affinity: -12,
        respect: -4,
        fear: 10,
        trust: -6,
        loyalty: 0,
        bondType: 'grudge',
        softBond: { strength: 78, since: 2, visibility: 'rumored' },
      },
    }

    const result = applyWorldNpcSocialSimulation(state, () => 0)
    const torvald = result.npcRuntimeStates.find((entry) => entry.npcId === 'npc-torvald-messe')
    const lira = result.npcRuntimeStates.find((entry) => entry.npcId === 'npc-lira-ashcroft')

    expect(result.relationships[key]?.bondType).toBe('feud')
    expect(result.relationships[reverse]?.bondType).toBe('feud')
    expect(torvald?.flags).toContain('feud-with:npc-lira-ashcroft')
    expect(lira?.flags).toContain('feud-with:npc-torvald-messe')
    expect(result.districtTension['district-harbor']).toBeGreaterThan(state.districtTension['district-harbor'])
    expect(result.rumors.some((rumor) => rumor.eventSource === 'world-npc-feud:npc-torvald-messe:npc-lira-ashcroft')).toBe(true)
  })
})
