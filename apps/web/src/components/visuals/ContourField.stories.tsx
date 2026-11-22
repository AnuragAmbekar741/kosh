import type { Meta, StoryObj } from "@storybook/react-vite"

import { ContourField } from "./ContourField"

const meta = {
  title: "Brand/ContourField",
  component: ContourField,
  parameters: { layout: "padded" },
  args: { still: false },
  render: (args) => (
    <div className="relative h-96 w-full max-w-2xl overflow-hidden rounded-2xl border bg-background">
      <ContourField {...args} />
    </div>
  ),
} satisfies Meta<typeof ContourField>

export default meta

type Story = StoryObj<typeof meta>

/** Decorative backdrop. Place it in a `relative overflow-hidden` box. */
export const Drifting: Story = {}

/** No drift: for use behind frosted glass, like the phone chat. */
export const Still: Story = {
  args: { still: true },
}

export const Faint: Story = {
  args: { opacity: 0.4 },
}
