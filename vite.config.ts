import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

const require = createRequire(import.meta.url)
const disableStorybookProject = process.env.CODEX_DISABLE_STORYBOOK_PROJECT === '1'

type VitestProject = {
  extends: boolean
  plugins?: unknown[]
  test: Record<string, unknown>
}

const projects: VitestProject[] = [
  {
    extends: true,
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/**/*.mdx'],
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  },
]

if (!disableStorybookProject) {
  const { storybookTest } = require('@storybook/addon-vitest/vitest-plugin')
  const { playwright } = require('@vitest/browser-playwright')

  projects.push({
    extends: true,
    plugins: [
      storybookTest({
        configDir: path.join(dirname, '.storybook'),
      }),
    ],
    test: {
      name: 'storybook',
      include: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/**/*.mdx'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({}),
        instances: [{ browser: 'chromium' }],
      },
    },
  })
}

export default defineConfig({
  plugins: [react()],
  test: {
    projects: projects as never,
  },
})
