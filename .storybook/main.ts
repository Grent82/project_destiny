import type { StorybookConfig } from '@storybook/react-vite';

const addonList = [
  "@chromatic-com/storybook",
  "@storybook/addon-vitest",
  "@storybook/addon-a11y",
  "@storybook/addon-docs",
  "@storybook/addon-mcp"
]

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": process.env.STORYBOOK_DISABLE_CHROMATIC === '1'
    ? addonList.filter((addon) => addon !== "@chromatic-com/storybook")
    : addonList,
  "framework": "@storybook/react-vite"
};
export default config;
