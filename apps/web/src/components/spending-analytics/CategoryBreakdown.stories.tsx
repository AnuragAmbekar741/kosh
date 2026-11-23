import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import type { Category } from "@/api/spend-items/spend-items.types"
import { analytics, emptyAnalytics } from "@/stories/fixtures"

import { CategoryBreakdown } from "./CategoryBreakdown"

const meta = {
  title: "Finance/CategoryBreakdown",
  component: CategoryBreakdown,
  parameters: { layout: "padded" },
  args: { data: analytics, selected: [], onToggle: fn() },
  render: function Render(args) {
    const [selected, setSelected] = useState<Category[]>(args.selected)
    return (
      <div className="max-w-md">
        <CategoryBreakdown
          {...args}
          onToggle={(category) => {
            setSelected((current) =>
              current.includes(category)
                ? current.filter((value) => value !== category)
                : [...current, category]
            )
            args.onToggle(category)
          }}
          selected={selected}
        />
      </div>
    )
  },
} satisfies Meta<typeof CategoryBreakdown>

export default meta

type Story = StoryObj<typeof meta>

/** Click a row to filter by that category. */
export const Default: Story = {}

export const WithSelection: Story = {
  args: { selected: ["Groceries", "Pet"] },
}

export const Empty: Story = {
  args: { data: emptyAnalytics },
}
