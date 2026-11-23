import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "./separator"

const meta = {
  title: "Core/Layout/Separator",
  component: Separator,
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: { orientation: "horizontal" },
} satisfies Meta<typeof Separator>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-3 text-sm">
      <span>Subtotal</span>
      <Separator {...args} />
      <span>Total</span>
    </div>
  ),
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-5 items-center gap-3 text-sm text-muted-foreground">
      <span>23 bills</span>
      <Separator {...args} />
      <span>141 items</span>
      <Separator {...args} />
      <span>₹801 avg</span>
    </div>
  ),
}
