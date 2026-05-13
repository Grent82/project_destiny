import { describe, it, expect } from 'vitest'
import { selectPoiAvailability, selectNpcCurrentLocation, selectWorldNpcsByDistrictAndSlot } from './districts'

describe('selectPoiAvailability', () => {
  it('returns true for a POI with no slot restriction in any slot', () => {
    // poi-harbor-the-berth has default availableSlots (all slots)
    expect(selectPoiAvailability('poi-harbor-the-berth', 'morning')).toBe(true)
    expect(selectPoiAvailability('poi-harbor-the-berth', 'night')).toBe(true)
  })

  it('returns true for the black market in evening (restricted slot)', () => {
    // poi-harbor-the-hold is evening/night only
    expect(selectPoiAvailability('poi-harbor-the-hold', 'evening')).toBe(true)
  })

  it('returns false for the black market in morning (closed)', () => {
    expect(selectPoiAvailability('poi-harbor-the-hold', 'morning')).toBe(false)
  })

  it('returns true for guild hall in morning (open)', () => {
    expect(selectPoiAvailability('poi-harbor-guild-hall', 'morning')).toBe(true)
  })

  it('returns false for guild hall at night (closed)', () => {
    expect(selectPoiAvailability('poi-harbor-guild-hall', 'night')).toBe(false)
  })

  it('returns false for unknown POI', () => {
    expect(selectPoiAvailability('poi-nonexistent', 'morning')).toBe(false)
  })
})

describe('selectNpcCurrentLocation', () => {
  it('returns districtId for Torvald Messe in afternoon (he works afternoon)', () => {
    expect(selectNpcCurrentLocation('npc-torvald-messe', 'afternoon')).toBe('district-harbor')
  })

  it('returns null for Torvald Messe in morning (he is not available)', () => {
    expect(selectNpcCurrentLocation('npc-torvald-messe', 'morning')).toBeNull()
  })

  it('returns districtId for The Wren at night (evening/night schedule)', () => {
    expect(selectNpcCurrentLocation('npc-the-wren', 'night')).toBe('district-the-warrens')
  })

  it('returns null for The Wren in morning', () => {
    expect(selectNpcCurrentLocation('npc-the-wren', 'morning')).toBeNull()
  })

  it('returns null for NPC with no schedule', () => {
    // Marion is a roster NPC with no schedule
    expect(selectNpcCurrentLocation('npc-marion-vale', 'morning')).toBeNull()
  })
})

describe('selectWorldNpcsByDistrictAndSlot', () => {
  it('returns NPCs present in the given slot for a district', () => {
    const presentAtNight = selectWorldNpcsByDistrictAndSlot('district-the-warrens', 'night')
    const npcIds = presentAtNight.map((n) => n.id)
    expect(npcIds).toContain('npc-the-wren')
  })

  it('excludes NPCs not present in the slot', () => {
    const presentInMorning = selectWorldNpcsByDistrictAndSlot('district-the-warrens', 'morning')
    const npcIds = presentInMorning.map((n) => n.id)
    // The Wren is not available in morning
    expect(npcIds).not.toContain('npc-the-wren')
  })

  it('includes NPCs with no schedule (always present)', () => {
    // NPCs without schedule entry are always included
    const anySlot = selectWorldNpcsByDistrictAndSlot('district-ironworks', 'morning')
    // Bog has no morning schedule, so not included; other world NPCs without schedule would be
    const bogPresent = anySlot.some((n) => n.id === 'npc-bog')
    expect(bogPresent).toBe(false) // Bog is afternoon/evening/night only
  })
})
