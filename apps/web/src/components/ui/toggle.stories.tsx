import type { Meta, StoryObj } from "@storybook/react-vite"
import { BookmarkIcon, ReceiptIcon, StarIcon } from "lucide-react"
import { fn } from "storybook/test"

import { Toggle } from "@/components/ui/toggle"

const VARIANTS = ["default", "outline"] as const
const SIZES = ["dense", "sm", "default", "lg"] as const

const meta = {
  title: "Core/Actions/Toggle",
  component: Toggle,
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
    disabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Only bills to review",
    children: (
      <>
        <ReceiptIcon data-icon="inline-start" />
        To review
      </>
    ),
    onPressedChange: fn(),
  },
} satisfies Meta<typeof Toggle>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = { args: { variant: "outline" } }

export const Pressed: Story = { args: { defaultPressed: true } }

export const IconOnly: Story = {
  args: {
    "aria-label": "Favourite merchant",
    variant: "outline",
    children: <StarIcon />,
  },
}

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          {SIZES.map((size) => (
            <Toggle
              key={size}
              {...args}
              aria-label={`Save for later (${size})`}
              size={size}
              variant={variant}
            >
              <BookmarkIcon data-icon="inline-start" />
              {size}
            </Toggle>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const Disabled: Story = { args: { disabled: true } }
