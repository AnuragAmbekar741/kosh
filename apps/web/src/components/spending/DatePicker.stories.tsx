import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { DatePicker } from "./DatePicker"

const meta = {
  title: "Finance/DatePicker",
  component: DatePicker,
  args: {
    "aria-label": "Bill date",
    value: "2026-11-18",
    onChange: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div className="w-64">
        <DatePicker
          {...args}
          onChange={(next) => {
            setValue(next)
            args.onChange(next)
          }}
          value={value}
        />
      </div>
    )
  },
} satisfies Meta<typeof DatePicker>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { value: "" },
}

export const Small: Story = {
  args: { size: "sm" },
}

export const Invalid: Story = {
  args: { value: "", invalid: true },
}
