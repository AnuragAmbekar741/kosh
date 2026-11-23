import type { Meta, StoryObj } from "@storybook/react-vite"
import { CheckIcon, ClockIcon } from "lucide-react"

import { Badge } from "./badge"

const VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const

const meta = {
  title: "Core/Feedback/Badge",
  component: Badge,
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
  },
  args: { children: "Needs review", variant: "default" },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = { args: { variant: "secondary" } }

export const Destructive: Story = {
  args: { variant: "destructive", children: "Failed" },
}

export const Outline: Story = {
  args: { variant: "outline", children: "Draft" },
}

export const WithIcon: Story = {
  render: (args) => (
    <div className="flex gap-2">
      <Badge {...args} variant="secondary">
        <CheckIcon />
        Saved
      </Badge>
      <Badge {...args} variant="outline">
        <ClockIcon />
        Reading
      </Badge>
    </div>
  ),
}

export const LongText: Story = {
  args: {
    variant: "outline",
    children: "Nestle Everyday Dairy Whitener Pouch 400g",
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
}
