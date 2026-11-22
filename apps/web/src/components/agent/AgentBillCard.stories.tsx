import type { Meta, StoryObj } from "@storybook/react-vite"

import { billAction, documentDetail, longLine } from "@/stories/fixtures"

import { AgentBillCard } from "./AgentBillCard"

const meta = {
  title: "Finance/AgentBillCard",
  component: AgentBillCard,
  parameters: { layout: "padded" },
  args: { action: billAction },
  render: (args) => (
    <div className="max-w-sm">
      <AgentBillCard {...args} />
    </div>
  ),
} satisfies Meta<typeof AgentBillCard>

export default meta

type Story = StoryObj<typeof meta>

/** Nothing is saved until Save bill. Edit opens the review dialog. */
export const Offered: Story = {}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PossibleDuplicate: Story = {
  args: { action: { ...billAction, possible_duplicates: 1 } },
}

export const LongLineText: Story = {
  parameters: {
    mockApi: {
      "GET /documents/doc-1": {
        ...documentDetail,
        drafts: [longLine, ...documentDetail.drafts],
      },
    },
  },
}

/** The bill's live state: confirmed elsewhere, so the card reads Saved. */
export const Saved: Story = {
  parameters: {
    mockApi: {
      "GET /documents/doc-1": { ...documentDetail, needs_review: false },
    },
  },
}

/** The bill no longer exists (404), so the card reads Discarded. */
export const Discarded: Story = {
  args: { action: { ...billAction, document_id: "doc-deleted" } },
}
