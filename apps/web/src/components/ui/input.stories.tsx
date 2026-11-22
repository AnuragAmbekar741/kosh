import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Input } from "@/components/ui/input"

const meta = {
  title: "Core/Forms/Input",
  component: Input,
  argTypes: {
    type: {
      control: "inline-radio",
      options: ["text", "number", "date", "search", "password", "file"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Merchant",
    placeholder: "Nature's Basket",
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = { args: { defaultValue: "DMart Ready" } }

export const Amount: Story = {
  args: {
    "aria-label": "Amount",
    inputMode: "decimal",
    placeholder: "0.00",
    className: "tabular-nums",
  },
}

export const Date: Story = {
  args: { "aria-label": "Bill date", type: "date", defaultValue: "2026-11-18" },
}

export const File: Story = {
  args: { "aria-label": "Bill photo", type: "file", accept: "image/*,.pdf" },
}

export const Invalid: Story = {
  args: { "aria-invalid": true, "aria-label": "Amount", defaultValue: "12,0" },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "INR" },
}

export const LongValue: Story = {
  args: {
    defaultValue:
      "NESTLE EVERYDAY DAIRY WHITENER POUCH 400G + FREE 50G PROMO PACK",
  },
}
