import type { Meta, StoryObj } from "@storybook/react-vite"

import { EngravedWordmark } from "./EngravedWordmark"

const meta = {
  title: "Brand/EngravedWordmark",
  component: EngravedWordmark,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EngravedWordmark>

export default meta

type Story = StoryObj<typeof meta>

/** The overview starter's Kosh wordmark. Breathes unless reduced motion is on. */
export const Default: Story = {}
