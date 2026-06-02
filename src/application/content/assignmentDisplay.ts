import type { NpcAssignment } from '../../domain/npc/contracts'
import { formatMarksPerDay } from '../../domain/game/currency'

type AssignmentDisplay = {
  label: string
  detail: string | null
}

export const ASSIGNMENT_DISPLAY_LABELS: Record<NpcAssignment, AssignmentDisplay> = {
  idle: {
    label: 'Available',
    detail: 'Available for deployment.',
  },
  training: {
    label: 'Training',
    detail: 'Gains skill, no income.',
  },
  working: {
    label: 'Working',
    detail: 'Earns Marks, cannot deploy or train.',
  },
  assigned_title: {
    label: 'On Duty',
    detail: 'Committed to title duty and unavailable for squad work.',
  },
  deployed: {
    label: 'Deployed',
    detail: 'Already committed to an active squad or field action.',
  },
  recovering: {
    label: 'Recovering',
    detail: 'Recovering from injury and not ready for assignment changes.',
  },
  defense: {
    label: 'On Watch',
    detail: 'Assigned to house defense.',
  },
  transferred: {
    label: 'Transferred',
    detail: 'No longer available to the house roster.',
  },
}

export function formatNpcAssignmentLabel(assignment: NpcAssignment): string {
  return ASSIGNMENT_DISPLAY_LABELS[assignment].label
}

export function getNpcAssignmentDetail(assignment: NpcAssignment): string | null {
  return ASSIGNMENT_DISPLAY_LABELS[assignment].detail
}

export function formatWorkingIncomePerDay(amount: number): string {
  return formatMarksPerDay(amount)
}
