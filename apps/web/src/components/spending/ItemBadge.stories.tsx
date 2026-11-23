import type { Meta, StoryObj } from "@storybook/react-vite"

import { billLines } from "@/stories/fixtures"

import { ItemBadge } from "./ItemBadge"

const [resolved, , needsReview, pending, notProduct] = billLines

const meta = {
  title: "Finance/ItemBadge",
  component: ItemBadge,
  args: { item: resolved },
} satisfies Meta<typeof ItemBadge>

export default meta

type Story = StoryObj<typeof meta>

/** A catalog match: the item name, family in the title. A tag, not the line text. */
export const Resolved: Story = {}

/** Dashed: the user should pick the product. */
export const NeedsReview: Story = {
  args: { item: needsReview },
}

export const Failed: Story = {
  args: { item: { item: null, item_status: "failed" } },
}

export const Matching: Story = {
  args: { item: pending },
}

export const NotAProduct: Story = {
  args: { item: notProduct },
}

/** `none` renders nothing. */
export const NoStatus: Story = {
  args: { item: { item: null, item_status: "none" } },
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {billLines.map((line) => (
        <ItemBadge item={line} key={line.id} />
      ))}
    </div>
  ),
}
