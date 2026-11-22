import type { Meta, StoryObj } from "@storybook/react-vite"
import { CheckCheckIcon, PlusIcon, UploadIcon } from "lucide-react"
import { fn } from "storybook/test"

import { Button } from "./button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyEyebrow,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty"

const VARIANTS = ["card", "plain"] as const

// Mirrors the ledger's first-use state (pages/spending/SpendingPage.tsx):
// a left-aligned banner on the slate mist, no colored strip or illustration.
const meta = {
  title: "Core/Feedback/Empty",
  component: Empty,
  parameters: { layout: "padded" },
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
  },
  args: { variant: "card" },
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyEyebrow>Start your ledger</EmptyEyebrow>
        <EmptyTitle>Your first bill goes here</EmptyTitle>
        <EmptyDescription>
          Add a receipt or start a bill from the top bar. Entries appear here
          after you save them.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={fn()}>
          <PlusIcon data-icon="inline-start" />
          Add spending
        </Button>
        <Button onClick={fn()} variant="outline">
          <UploadIcon data-icon="inline-start" />
          Upload receipt
        </Button>
      </EmptyContent>
    </Empty>
  ),
} satisfies Meta<typeof Empty>

export default meta

type Story = StoryObj<typeof meta>

/** A page with nothing to show yet. */
export const Card: Story = {}

/** Filters left nothing: one action, no media. */
export const NoMatches: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyEyebrow>Filters</EmptyEyebrow>
        <EmptyTitle>Nothing matches</EmptyTitle>
        <EmptyDescription>
          No bills match the current filters. Try a wider date range or clear a
          category.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={fn()} variant="outline">
          Reset filters
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

/** Inside a popover or panel that already frames it, e.g. notifications. */
export const Plain: Story = {
  args: { variant: "plain" },
  render: (args) => (
    <div className="w-[360px] max-w-full rounded-xl bg-popover ring-1 ring-foreground/10">
      <Empty {...args}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCheckIcon />
          </EmptyMedia>
          <EmptyTitle>You’re all caught up</EmptyTitle>
          <EmptyDescription>
            Bills you upload show up here while they’re read, and again when
            they need your review.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  ),
}

export const LongText: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyEyebrow>Analytics</EmptyEyebrow>
        <EmptyTitle>
          No spending in this period yet, so there’s nothing to chart
        </EmptyTitle>
        <EmptyDescription>
          Charts fill in once you save bills dated inside the selected range.
          Pick a wider range, switch currency, or add a bill to see where your
          money went across categories, merchants and weekdays.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <Empty key={variant} variant={variant}>
          <EmptyHeader>
            <EmptyEyebrow>{variant}</EmptyEyebrow>
            <EmptyTitle>No bills yet</EmptyTitle>
            <EmptyDescription>Saved bills appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ))}
    </div>
  ),
}
