import { describe, expect, it } from 'vitest'

type ProjectWithTest = {
  test?: {
    name?: string
    environment?: string
    include?: string[]
    exclude?: string[]
  }
}

describe('vitest project scoping', () => {
  it('limits the storybook browser project to story files', async () => {
    process.env.STORYBOOK_DISABLE_CHROMATIC = '1'
    const { default: config } = await import('../../vite.config')
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

  it('keeps the primary jsdom project scoped to normal test files', async () => {
    process.env.STORYBOOK_DISABLE_CHROMATIC = '1'
    const { default: config } = await import('../../vite.config')
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
  })
})
