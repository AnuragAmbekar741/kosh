import type { Meta, StoryObj } from "@storybook/react-vite"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { fn } from "storybook/test"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const VARIANTS = ["default", "outline"] as const
const SIZES = ["dense", "sm", "default", "lg"] as const

const PERIODS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

const THEMES = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
]

const meta = {
  title: "Core/Actions/ToggleGroup",
  component: ToggleGroup,
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    spacing: { control: { type: "number", min: 0, max: 4 } },
  },
  args: {
    "aria-label": "Spend period",
    defaultValue: ["month"],
    variant: "outline",
    spacing: 0,
    onValueChange: fn(),
  },
  render: (args) => (
    <ToggleGroup {...args}>
      {PERIODS.map((period) => (
        <ToggleGroupItem key={period.value} value={period.value}>
          {period.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  ),
} satisfies Meta<typeof ToggleGroup>

export default meta

type Story = StoryObj<typeof meta>

/** A segmented control: one value at a time. */
export const Segmented: Story = {}

export const Spaced: Story = { args: { spacing: 2, variant: "default" } }

export const Vertical: Story = { args: { orientation: "vertical" } }

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      {SIZES.map((size) => (
        <ToggleGroup key={size} {...args} size={size}>
          {PERIODS.map((period) => (
            <ToggleGroupItem key={period.value} value={period.value}>
              {period.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ))}
    </div>
  ),
}

/** As in the phone account sheet: full width, icon + label. */
export const ThemePicker: Story = {
  args: { "aria-label": "Theme", defaultValue: ["dark"], spacing: 1 },
  render: (args) => (
    <div className="w-80">
      <ToggleGroup {...args} className="w-full">
        {THEMES.map(({ value, label, Icon }) => (
          <ToggleGroupItem className="flex-1" key={value} value={value}>
            <Icon />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  ),
}

export const Disabled: Story = { args: { disabled: true } }
