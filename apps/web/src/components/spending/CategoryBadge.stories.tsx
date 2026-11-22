import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { CATEGORIES } from "@/components/spending/categories"

import { CategoryBadge } from "./CategoryBadge"

const meta = {
  title: "Finance/CategoryBadge",
  component: CategoryBadge,
  argTypes: {
    category: { control: "select", options: [null, ...CATEGORIES] },
  },
  args: { category: "Groceries" },
} satisfies Meta<typeof CategoryBadge>

export default meta

type Story = StoryObj<typeof meta>

/** Display only: no `onSelect`. */
export const Label: Story = {}

export const NoCategory: Story = {
  args: { category: null },
}

export const EveryCategory: Story = {
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      {CATEGORIES.map((category) => (
        <CategoryBadge category={category} key={category} />
      ))}
    </div>
  ),
}

/** With `onSelect` the badge opens a menu of every category. */
export const Selectable: Story = {
  args: { onSelect: fn() },
}

export const SelectableDisabled: Story = {
  args: { onSelect: fn(), disabled: true },
}
