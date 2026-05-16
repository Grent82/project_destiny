import { describe, it, expect } from 'vitest'
import { selectHouseholdById, selectHouseholdsByDistrict, selectHouseholdStatus } from './world'

describe('world household selectors', () => {
  it('selectHouseholdById returns the correct household', () => {
    const sorn = selectHouseholdById('world-house-sorn')
    expect(sorn).toBeDefined()
    expect(sorn?.name).toBe('House Sorn')
    expect(sorn?.kind).toBe('household')
    expect(sorn?.districtId).toBe('district-the-northbank')
  })

  it('selectHouseholdById returns undefined for unknown id', () => {
    expect(selectHouseholdById('world-does-not-exist')).toBeUndefined()
  })

  it('selectHouseholdsByDistrict returns all households in a district', () => {
    const northbank = selectHouseholdsByDistrict('district-the-northbank')
    const ids = northbank.map((h) => h.id)
    expect(ids).toContain('world-house-sorn')
    expect(ids).toContain('world-salt-ledger-hall')
    expect(ids).toContain('world-house-sable-cairn')
  })

  it('selectHouseholdsByDistrict returns empty array for unknown district', () => {
    expect(selectHouseholdsByDistrict('district-nonexistent')).toHaveLength(0)
  })

  it('selectHouseholdStatus returns stability and reputation tiers', () => {
    const status = selectHouseholdStatus('world-house-sorn')
    expect(status).not.toBeNull()
    expect(status?.stabilityScore).toBe(70)
    expect(status?.stabilityTier).toBe('Strained')
    expect(status?.reputationScore).toBe(80)
    expect(status?.reputationTier).toBe('Distinguished')
    expect(status?.securityScore).toBe(65)
  })

  it('selectHouseholdStatus returns null for unknown id', () => {
    expect(selectHouseholdStatus('world-unknown')).toBeNull()
  })

  it('all 6 authored world households parse without error', () => {
    const ids = [
      'world-house-sorn',
      'world-house-merrow',
      'world-lantern-vale',
      'world-chapel-saint-vey',
      'world-salt-ledger-hall',
      'world-house-sable-cairn',
    ]
    for (const id of ids) {
      expect(selectHouseholdById(id), `${id} should exist`).toBeDefined()
    }
  })

  it('world households in The Pale include the chapel', () => {
    const pale = selectHouseholdsByDistrict('district-the-pale')
    const ids = pale.map((h) => h.id)
    expect(ids).toContain('world-chapel-saint-vey')
  })

  it('the Lantern Vale Inn is in Cinder Row', () => {
    const cinderRow = selectHouseholdsByDistrict('district-cinder-row')
    const ids = cinderRow.map((h) => h.id)
    expect(ids).toContain('world-lantern-vale')
  })

  it('failing household has correct stability tier', () => {
    const sableCairn = selectHouseholdStatus('world-house-sable-cairn')
    expect(sableCairn?.stabilityScore).toBe(35)
    expect(sableCairn?.stabilityTier).toBe('Fragile')
  })
})
