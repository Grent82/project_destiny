import type { Meta, StoryObj } from '@storybook/react'
import { ConfirmationModal } from '../ConfirmationModal'

const meta: Meta<typeof ConfirmationModal> = {
  title: 'Components/ConfirmationModal',
  component: ConfirmationModal,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof ConfirmationModal>

export const Default: Story = {
  args: {
    heading: 'Sell Iron Sword?',
    consequence: 'This item will be removed from your stash permanently.',
    onConfirm: () => {},
    onCancel: () => {},
  },
}

export const DestructiveWithCustomLabel: Story = {
  args: {
    heading: 'Revoke Steward title from Ida Rhys?',
    consequence: 'Ida will lose all title bonuses. This cannot be undone.',
    confirmLabel: 'Revoke title',
    onConfirm: () => {},
    onCancel: () => {},
  },
}
