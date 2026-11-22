import type { Meta, StoryObj } from "@storybook/react-vite"

import { spendSummary } from "@/stories/fixtures"

import { AgentSummaryCard } from "./AgentSummaryCard"

const meta = {
  title: "Finance/AgentSummaryCard",
  component: AgentSummaryCard,
  parameters: { layout: "padded" },
  render: () => (
    <div className="max-w-sm">
      <AgentSummaryCard />
    </div>
  ),
} satisfies Meta<typeof AgentSummaryCard>

export default meta

type Story = StoryObj<typeof meta>

/** This month's total and bills to review, from the summary and inbox queries. */
export const Default: Story = {}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const NothingToReview: Story = {
  parameters: { mockApi: { "GET /documents": [] } },
}

export const NoSpendYet: Story = {
  parameters: {
    mockApi: {
      "GET /documents": [],
      "GET /spend-items/summary": {
        ...spendSummary,
        total: "0",
        bill_count: 0,
        item_count: 0,
        has_spend: false,
        comparison: null,
      },
    },
  },
}
