import { describe, it, expect } from 'vitest'
import { RUNWAY_BAR_MAX_DAYS, runwayBarClass, runwayBarPercent } from './runwayIndicator'

describe('runwayBarClass', () => {
  it('is safe (green) above 60 days', () => {
    expect(runwayBarClass(61)).toBe('ledger-runway--safe')
    expect(runwayBarClass(180)).toBe('ledger-runway--safe')
  })

  it('is caution (yellow) at the 60-day boundary down to just above 30', () => {
    expect(runwayBarClass(60)).toBe('ledger-runway--caution')
    expect(runwayBarClass(31)).toBe('ledger-runway--caution')
  })

  it('is warning (orange) at the 30-day boundary down to just above 15', () => {
    expect(runwayBarClass(30)).toBe('ledger-runway--warning')
    expect(runwayBarClass(16)).toBe('ledger-runway--warning')
  })

  it('is critical (red) at the 15-day boundary and below', () => {
    expect(runwayBarClass(15)).toBe('ledger-runway--critical')
    expect(runwayBarClass(0)).toBe('ledger-runway--critical')
  })
})

describe('runwayBarPercent', () => {
  it('is 100% when unbounded regardless of the day count', () => {
    expect(runwayBarPercent(999, true)).toBe(100)
  })

  it('is proportional to RUNWAY_BAR_MAX_DAYS', () => {
    expect(runwayBarPercent(RUNWAY_BAR_MAX_DAYS, false)).toBe(100)
    expect(runwayBarPercent(RUNWAY_BAR_MAX_DAYS / 2, false)).toBe(50)
    expect(runwayBarPercent(0, false)).toBe(0)
  })

  it('caps at 100% for day counts beyond the max', () => {
    expect(runwayBarPercent(RUNWAY_BAR_MAX_DAYS * 2, false)).toBe(100)
  })
})
