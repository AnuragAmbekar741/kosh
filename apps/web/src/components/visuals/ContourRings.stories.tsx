import type { Meta, StoryObj } from "@storybook/react-vite"

import { ContourRings } from "./ContourRings"

const meta = {
  title: "Brand/ContourRings",
  component: ContourRings,
  parameters: { layout: "padded" },
  render: (args) => (
    <div className="relative h-96 w-full max-w-2xl overflow-hidden rounded-2xl border bg-background">
      <ContourRings {...args} />
    </div>
  ),
} satisfies Meta<typeof ContourRings>

export default meta

type Story = StoryObj<typeof meta>

/** Faint rings in the top-right. Place it in a `relative overflow-hidden` box. */
export const Default: Story = {}
