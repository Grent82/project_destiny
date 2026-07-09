import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntimacyOptionsModal } from './IntimacyOptionsModal'

describe('IntimacyOptionsModal (destiny-w5tv)', () => {
  it('renders both sections unconditionally', () => {
    render(
      <IntimacyOptionsModal
        npcName="Marion Vale"
        requiresConsent={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: /contraception/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pregnancy intent/i })).toBeInTheDocument()
  })

  it('keeps Spend the Night enabled regardless of requiresConsent (checkbox-based consent gate removed)', () => {
    render(
      <IntimacyOptionsModal
        npcName="Marion Vale"
        requiresConsent={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /spend the night/i })).toBeEnabled()
  })

  it('passes the selected contraception and pregnancy intent through to onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <IntimacyOptionsModal
        npcName="Marion Vale"
        requiresConsent={false}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /use contraception/i }))
    await user.click(screen.getByRole('radio', { name: /avoid pregnancy/i }))
    await user.click(screen.getByRole('button', { name: /spend the night/i }))

    expect(onConfirm).toHaveBeenCalledWith({ contraception: true, intent: 'avoid-pregnancy'})
  })

  it('always keeps Cancel enabled and calls onCancel when clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <IntimacyOptionsModal
        npcName="Marion Vale"
        requiresConsent={true}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeEnabled()
    await user.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <IntimacyOptionsModal
        npcName="Marion Vale"
        requiresConsent={false}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
