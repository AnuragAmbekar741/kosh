import type { Meta, StoryObj } from "@storybook/react-vite"

import { analytics, emptyAnalytics } from "@/stories/fixtures"

import { AnalyticsStats } from "./AnalyticsStats"

const meta = {
  title: "Finance/AnalyticsStats",
  component: AnalyticsStats,
  parameters: { layout: "padded" },
  args: { data: analytics, periodLabel: "this month" },
} satisfies Meta<typeof AnalyticsStats>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoComparison: Story = {
  args: { data: { ...analytics, comparison: null } },
}

export const Empty: Story = {
  args: { data: emptyAnalytics },
}
