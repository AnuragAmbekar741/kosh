import type { Meta, StoryObj } from "@storybook/react-vite"

import { billLines } from "@/stories/fixtures"

import { ItemPicker } from "./ItemPicker"

const [resolved, , needsReview] = billLines

const meta = {
  title: "Finance/ItemPicker",
  component: ItemPicker,
  args: { line: needsReview },
} satisfies Meta<typeof ItemPicker>

export default meta

type Story = StoryObj<typeof meta>

/** Click the badge to search the catalog (served by the story mock). */
export const NeedsReview: Story = {}

export const Resolved: Story = {
  args: { line: resolved },
}
