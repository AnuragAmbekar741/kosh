import type { StorybookConfig } from "@storybook/react-vite"

// Reuses vite.config.ts, so Tailwind v4 and the `@/` alias work as in the app.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Own props only, not inherited HTML attributes.
      propFilter: (prop) =>
        prop.parent ? !prop.parent.fileName.includes("node_modules") : true,
    },
  },
}

export default config
