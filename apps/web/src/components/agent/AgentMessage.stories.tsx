import type { Meta, StoryObj } from "@storybook/react-vite"

import { AgentMessage } from "./AgentMessage"

const meta = {
  title: "Finance/AgentMessage",
  component: AgentMessage,
  parameters: { layout: "padded" },
  args: {
    role: "assistant",
    content:
      "You spent **₹18,432.75** this month, 8% less than October.\n\n- Groceries: ₹7,240.30\n- Dining out: ₹4,310.00\n- Household: ₹2,190.45",
  },
  render: (args) => (
    <div className="max-w-md">
      <AgentMessage {...args} />
    </div>
  ),
} satisfies Meta<typeof AgentMessage>

export default meta

type Story = StoryObj<typeof meta>

/** Replies render limited Markdown: bold, lists, links. No raw HTML. */
export const Reply: Story = {}

export const User: Story = {
  args: { role: "user", content: "How much did I spend on groceries?" },
}

export const Conversation: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <AgentMessage
        content="Add 450 for dinner at Toit yesterday"
        role="user"
      />
      <AgentMessage
        content="Got it. I drafted a **Dining out** bill from Toit for ₹450.00. Check it and save."
        role="assistant"
      />
    </div>
  ),
}
