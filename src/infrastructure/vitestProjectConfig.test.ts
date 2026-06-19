import { describe, expect, it, vi } from 'vitest'

type ProjectWithTest = {
  test?: {
    name?: string
    environment?: string
    include?: string[]
    exclude?: string[]
  }
}

async function loadResolvedConfig() {
  const mod = await import('../../vite.config')
  const exported = mod.default as unknown
  if (typeof exported === 'function') {
    return exported()
  }
  return exported
}

describe('vitest project scoping', () => {
  it.runIf(process.env.CODEX_DISABLE_STORYBOOK_PROJECT !== '1')('limits the storybook browser project to story files', async () => {
    process.env.STORYBOOK_DISABLE_CHROMATIC = '1'
    delete process.env.CODEX_DISABLE_STORYBOOK_PROJECT
    vi.resetModules()
    const config = await loadResolvedConfig()
    const projects = (config.test?.projects ?? []) as ProjectWithTest[]
    expect(Array.isArray(projects)).toBe(true)

    const storybookProject = projects.find(
      (project) => project.test?.name === 'storybook',
    )

    expect(storybookProject?.test?.include).toEqual([
      'src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
      'src/**/*.mdx',
    ])
  })

  it('keeps the primary jsdom project scoped to normal test files for local codex wrapper runs', async () => {
    process.env.STORYBOOK_DISABLE_CHROMATIC = '1'
    process.env.CODEX_DISABLE_STORYBOOK_PROJECT = '1'
    vi.resetModules()
    const config = await loadResolvedConfig()
    const projects = (config.test?.projects ?? []) as ProjectWithTest[]
    expect(Array.isArray(projects)).toBe(true)

    const jsdomProject = projects.find(
      (project) => project.test?.environment === 'jsdom',
    )

    expect(jsdomProject?.test?.include).toEqual([
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ])
    expect(jsdomProject?.test?.exclude).toEqual([
      'src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
      'src/**/*.mdx',
    ])

    delete process.env.CODEX_DISABLE_STORYBOOK_PROJECT
  })

  it('can omit the storybook browser project for local codex wrapper runs', async () => {
    process.env.STORYBOOK_DISABLE_CHROMATIC = '1'
    process.env.CODEX_DISABLE_STORYBOOK_PROJECT = '1'
    vi.resetModules()
    const config = await loadResolvedConfig()
    const projects = (config.test?.projects ?? []) as ProjectWithTest[]

    expect(
      projects.find((project) => project.test?.name === 'storybook'),
    ).toBeUndefined()

    delete process.env.CODEX_DISABLE_STORYBOOK_PROJECT
  })
})
