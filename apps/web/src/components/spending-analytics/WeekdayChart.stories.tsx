import type { Meta, StoryObj } from "@storybook/react-vite"

import { analytics, emptyAnalytics } from "@/stories/fixtures"

import { WeekdayChart } from "./WeekdayChart"

const meta = {
  title: "Finance/WeekdayChart",
  component: WeekdayChart,
  parameters: { layout: "padded" },
  args: { data: analytics },
  render: (args) => (
    <div className="max-w-md">
      <WeekdayChart {...args} />
    </div>
  ),
} satisfies Meta<typeof WeekdayChart>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { data: emptyAnalytics },
}
