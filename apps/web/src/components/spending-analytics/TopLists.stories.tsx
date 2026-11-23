import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { analytics, emptyAnalytics } from "@/stories/fixtures"

import { LargestBills, TopMerchants } from "./TopLists"

const meta = {
  title: "Finance/TopLists",
  component: TopMerchants,
  parameters: { layout: "padded" },
  args: { data: analytics, onOpenMerchant: fn() },
  render: (args) => (
    <div className="max-w-md">
      <TopMerchants {...args} />
    </div>
  ),
} satisfies Meta<typeof TopMerchants>

export default meta

type Story = StoryObj<typeof meta>

export const Merchants: Story = {}

export const MerchantsEmpty: Story = {
  args: { data: emptyAnalytics },
}

export const Largest: Story = {
  render: (args) => (
    <div className="max-w-md">
      <LargestBills {...args} />
    </div>
  ),
}

export const LargestEmpty: Story = {
  args: { data: emptyAnalytics },
  render: (args) => (
    <div className="max-w-md">
      <LargestBills {...args} />
    </div>
  ),
}
