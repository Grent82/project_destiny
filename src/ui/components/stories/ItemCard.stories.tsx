import type { Meta, StoryObj } from '@storybook/react-vite'
import { ItemCard } from '../ItemCard'

const meta: Meta<typeof ItemCard> = {
  title: 'Components/ItemCard',
  component: ItemCard,
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof ItemCard>

export const BasicConsumable: Story = {
  args: {
    instanceId: 'inst-001',
    name: 'Field Dressing',
    category: 'consumable',
    description: 'Stops bleeding and restores 15 health.',
    quantity: 1,
    primaryAction: { label: 'Use', type: 'use' as const, requiresTarget: false },
    onAction: () => {},
  },
}

export const StackedItem: Story = {
  args: {
    instanceId: 'inst-002',
    name: 'Iron Ration',
    category: 'consumable',
    quantity: 8,
    onAction: () => {},
  },
}

export const WeaponWithMenu: Story = {
  args: {
    instanceId: 'inst-003',
    name: 'Iron Sword',
    category: 'weapon',
    description: 'A serviceable blade.',
    quantity: 1,
    primaryAction: { label: 'Equip', type: 'equip' as const, requiresTarget: false },
    onAction: () => {},
    onOpenMenu: () => {},
  },
}

export const NoActions: Story = {
  args: {
    instanceId: 'inst-004',
    name: 'Locked Chest',
    category: 'container',
    quantity: 1,
    onAction: () => {},
  },
}
