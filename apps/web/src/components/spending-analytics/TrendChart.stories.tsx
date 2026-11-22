import type { Meta, StoryObj } from "@storybook/react-vite"

import { analytics, emptyAnalytics } from "@/stories/fixtures"

import { TrendChart } from "./TrendChart"

const meta = {
  title: "Finance/TrendChart",
  component: TrendChart,
  parameters: { layout: "padded" },
  args: { data: analytics, periodLabel: "this month" },
  // The chart fills its card, so the card needs a height, as the page's grid
  // row gives it.
  render: (args) => (
    <div className="h-96 max-w-3xl">
      <TrendChart className="h-full" {...args} />
    </div>
  ),
} satisfies Meta<typeof TrendChart>

export default meta

type Story = StoryObj<typeof meta>

export const Daily: Story = {}

export const Empty: Story = {
  args: { data: emptyAnalytics },
}
