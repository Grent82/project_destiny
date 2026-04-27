import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AppProviders } from '../app/AppProviders'
import { ShopsScreen } from './ShopsScreen'

describe('ShopsScreen', () => {
  it('renders seeded shops and updates visible money and owned quantity after purchase', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <ShopsScreen />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Shops' })).toBeInTheDocument()
    expect(screen.getByText('Harbor Provisions')).toBeInTheDocument()
    expect(screen.getByText('Available funds: 300 credits')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Buy' })[0])

    expect(screen.getByText('Available funds: 205 credits')).toBeInTheDocument()
    expect(screen.getAllByText(/Owned 3/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Purchased Field Medkit from Harbor Provisions/i)).toBeInTheDocument()
    expect(screen.getAllByText('Best price').length).toBeGreaterThan(0)
  })
})
