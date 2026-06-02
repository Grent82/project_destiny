import { ASSIGNMENT_DISPLAY_LABELS, formatNpcAssignmentLabel, formatWorkingIncomePerDay } from './assignmentDisplay'
import { formatMarksPerDay, formatMarksPerWeek } from '../../domain/game/currency'

describe('assignmentDisplay', () => {
  it('provides a canonical label for every runtime assignment', () => {
    expect(ASSIGNMENT_DISPLAY_LABELS.idle.label).toBe('Available')
    expect(ASSIGNMENT_DISPLAY_LABELS.assigned_title.label).toBe('On Duty')
    expect(ASSIGNMENT_DISPLAY_LABELS.defense.label).toBe('On Watch')
    expect(ASSIGNMENT_DISPLAY_LABELS.transferred.label).toBe('Transferred')
  })

  it('formats assignment labels and working income consistently', () => {
    expect(formatNpcAssignmentLabel('recovering')).toBe('Recovering')
    expect(formatWorkingIncomePerDay(7)).toBe('7 Marks/day')
    expect(formatMarksPerDay(4)).toBe('4 Marks/day')
    expect(formatMarksPerWeek(28)).toBe('28 Marks/week')
  })
})
