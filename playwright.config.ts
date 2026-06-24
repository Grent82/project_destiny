import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 *
 * Run locally:
 *   pnpm test:e2e              # All tests, headless
 *   pnpm test:e2e --ui         # Interactive UI mode
 *   pnpm test:e2e --debug      # Debug mode with step-by-step
 *   pnpm test:e2e shop.spec.ts # Single test file
 *
 * Generate HTML report:
 *   pnpm test:e2e --reporter=html
 *   npx playwright show-report
 */
export default defineConfig({
  testDir: './e2e',

  // Fail fast on first error (disable for debugging)
  forbidOnly: !!process.env.CI,

  // Retry once on CI to handle flaky tests
  retries: process.env.CI ? 1 : 0,

  // Run tests in parallel
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],

  // Shared test settings
  use: {
    baseURL: 'http://localhost:5173',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure (optional)
    video: 'retain-on-failure',

    // Trace recording for debugging
    trace: 'retain-on-failure',

    // Timeout for each test
    timeout: 30000,
    maxFailures: process.env.CI ? undefined : 5,
  },

  // Browser configuration
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
