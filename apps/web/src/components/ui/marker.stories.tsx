import type { Meta, StoryObj } from "@storybook/react-vite"
import { CheckCircle2Icon, ReceiptIcon } from "lucide-react"

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"

const meta = {
  title: "Core/Chat/Marker",
  component: Marker,
  args: {
    variant: "default",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "separator", "border"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[min(100vw-2rem,28rem)]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Marker {...args}>
      <MarkerIcon>
        <ReceiptIcon />
      </MarkerIcon>
      <MarkerContent>Read 5 items from the bill</MarkerContent>
    </Marker>
  ),
} satisfies Meta<typeof Marker>

export default meta

type Story = StoryObj<typeof meta>

/** A status line in the thread, e.g. a tool step. */
export const Default: Story = {}

/** A day divider between turns. */
export const Separator: Story = {
  args: { variant: "separator" },
  render: (args) => (
    <Marker {...args}>
      <MarkerContent>Yesterday</MarkerContent>
    </Marker>
  ),
}

export const Border: Story = {
  args: { variant: "border" },
  render: (args) => (
    <Marker {...args}>
      <MarkerIcon>
        <CheckCircle2Icon />
      </MarkerIcon>
      <MarkerContent>Bill saved to November</MarkerContent>
    </Marker>
  ),
}
