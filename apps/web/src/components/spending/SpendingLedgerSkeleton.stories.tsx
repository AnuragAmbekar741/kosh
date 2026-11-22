import type { Meta, StoryObj } from "@storybook/react-vite"

import { SpendingLedgerSkeleton } from "./SpendingLedgerSkeleton"

const meta = {
  title: "Finance/SpendingLedgerSkeleton",
  component: SpendingLedgerSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SpendingLedgerSkeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
