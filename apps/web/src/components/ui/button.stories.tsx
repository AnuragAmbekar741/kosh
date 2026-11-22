import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ChevronRightIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { fn } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const

const TEXT_SIZES = ["xs", "sm", "default", "lg"] as const

const ICON_SIZES = [
  "icon-xs",
  "icon-sm",
  "icon",
  "icon-lg",
  "icon-dense",
  "icon-dense-sm",
  "icon-fab",
] as const

const meta = {
  title: "Core/Actions/Button",
  component: Button,
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
    size: {
      control: "inline-radio",
      options: [...TEXT_SIZES, ...ICON_SIZES],
    },
    disabled: { control: "boolean" },
  },
  args: {
    children: "Save bill",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = { args: { variant: "outline" } }

export const Secondary: Story = { args: { variant: "secondary" } }

export const Ghost: Story = { args: { variant: "ghost" } }

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete bill" },
}

export const Link: Story = {
  args: { variant: "link", children: "View all bills" },
}

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {TEXT_SIZES.map((size) => (
          <Button key={size} {...args} size={size}>
            {size}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {ICON_SIZES.map((size) => (
          <Button
            key={size}
            {...args}
            aria-label={`Add bill (${size})`}
            size={size}
            variant="outline"
          >
            <PlusIcon />
          </Button>
        ))}
      </div>
    </div>
  ),
}

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args}>
        <PlusIcon data-icon="inline-start" />
        Add spending
      </Button>
      <Button {...args} variant="outline">
        <UploadIcon data-icon="inline-start" />
        Upload bill
      </Button>
      <Button {...args} variant="ghost">
        Next month
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
      <Button {...args} variant="destructive">
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
    </div>
  ),
}

export const IconOnly: Story = {
  args: {
    "aria-label": "Add bill",
    size: "icon",
    variant: "outline",
    children: <PlusIcon />,
  },
}

/** The phone's floating nav button. */
export const FloatingAction: Story = {
  args: {
    "aria-label": "Add spending",
    size: "icon-fab",
    children: <PlusIcon />,
  },
}

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Spinner data-icon="inline-start" />
      Saving…
    </Button>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} disabled variant={variant}>
          <SaveIcon data-icon="inline-start" />
          {variant}
        </Button>
      ))}
    </div>
  ),
}

export const Invalid: Story = {
  args: { "aria-invalid": true, variant: "outline", children: "Pick a date" },
}

export const LongLabel: Story = {
  render: (args) => (
    <div className="w-64">
      <Button {...args} className="w-full">
        Save 14 lines from Nature&apos;s Basket, 18 Nov
      </Button>
    </div>
  ),
}
