import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { EmptyState } from '../EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  decorators: [(Story: React.ComponentType) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: { message: 'No contracts available.' },
}

export const WithIcon: Story = {
  args: { message: 'No active investigations.', icon: '🔍' },
}

export const WithButtonCta: Story = {
  args: {
    message: 'Your roster is empty.',
    icon: '⚔️',
    cta: { label: 'Hire someone', onClick: () => {} },
  },
}

export const WithLinkCta: Story = {
  args: {
    message: 'No factions found.',
    icon: '⚑',
    cta: { label: 'Visit Contracts', to: '/contracts' },
  },
}
