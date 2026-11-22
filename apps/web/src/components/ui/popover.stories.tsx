import type { Meta, StoryObj } from "@storybook/react-vite"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

const meta = {
  title: "Core/Overlays/Popover",
  component: PopoverContent,
  args: {
    align: "center",
    side: "bottom",
  },
  argTypes: {
    align: { control: "inline-radio", options: ["start", "center", "end"] },
    side: {
      control: "inline-radio",
      options: ["top", "right", "bottom", "left"],
    },
  },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 items-start justify-center pt-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PopoverContent>

export default meta

type Story = StoryObj<typeof meta>

function Body() {
  return (
    <PopoverHeader>
      <PopoverTitle>Bill date</PopoverTitle>
      <PopoverDescription>
        Read from the photo. Change it if the shop printed the wrong day.
      </PopoverDescription>
    </PopoverHeader>
  )
}

export const Open: Story = {
  render: (args) => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant="outline" />}>
        <CalendarIcon data-icon="inline-start" />
        18 Nov 2026
      </PopoverTrigger>
      <PopoverContent {...args}>
        <Body />
      </PopoverContent>
    </Popover>
  ),
}

export const WithTrigger: Story = {
  render: (args) => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <CalendarIcon data-icon="inline-start" />
        18 Nov 2026
      </PopoverTrigger>
      <PopoverContent {...args}>
        <Body />
      </PopoverContent>
    </Popover>
  ),
}
