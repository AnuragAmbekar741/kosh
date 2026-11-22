import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "./skeleton"

const meta = {
  title: "Core/Feedback/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The shape of a ledger row while bills load. */
export const LedgerRow: Story = {
  render: () => (
    <div className="flex w-[420px] max-w-full items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  ),
}

export const StatTile: Story = {
  render: () => (
    <div className="flex w-56 flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  ),
}
