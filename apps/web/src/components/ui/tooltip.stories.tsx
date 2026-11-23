import type { Meta, StoryObj } from "@storybook/react-vite"
import { CameraIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const meta = {
  title: "Core/Overlays/Tooltip",
  component: TooltipContent,
  args: {
    side: "top",
    align: "center",
  },
  argTypes: {
    side: {
      control: "inline-radio",
      options: ["top", "right", "bottom", "left"],
    },
    align: { control: "inline-radio", options: ["start", "center", "end"] },
  },
  decorators: [
    (Story) => (
      <div className="p-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TooltipContent>

export default meta

type Story = StoryObj<typeof meta>

/** Icon-only buttons get a tooltip that repeats their aria-label. */
export const Open: Story = {
  render: (args) => (
    <Tooltip defaultOpen>
      <TooltipTrigger
        render={
          <Button aria-label="Scan a bill" size="icon" variant="outline" />
        }
      >
        <CameraIcon />
      </TooltipTrigger>
      <TooltipContent {...args}>Scan a bill</TooltipContent>
    </Tooltip>
  ),
}

export const WithTrigger: Story = {
  render: (args) => (
    <Tooltip>
      <TooltipTrigger
        render={<Button aria-label="Ask Kosh" size="icon" variant="ghost" />}
      >
        <SparklesIcon />
      </TooltipTrigger>
      <TooltipContent {...args}>Ask Kosh</TooltipContent>
    </Tooltip>
  ),
}
