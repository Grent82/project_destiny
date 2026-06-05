import type { Meta, StoryObj } from '@storybook/react'
import { TimeCostBadge } from '../TimeCostBadge'

const meta: Meta<typeof TimeCostBadge> = {
  title: 'Components/TimeCostBadge',
  component: TimeCostBadge,
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof TimeCostBadge>

export const OneSlot: Story = {
  args: { cost: 1 },
}

export const TwoSlots: Story = {
  args: { cost: 2 },
}

export const HalfDay: Story = {
  args: { cost: 4 },
}
