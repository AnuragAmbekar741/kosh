import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Core/Forms/Textarea",
  component: Textarea,
  argTypes: { disabled: { control: "boolean" } },
  args: {
    "aria-label": "Note",
    placeholder: "Split with Priya, she owes half",
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Grows with its content (`field-sizing-content`). */
export const LongText: Story = {
  args: {
    defaultValue:
      "Bought the monthly groceries at Nature's Basket. The milk and bread are for the week, the detergent should last two months, and the dog food is the big 1.2kg pack because it was on offer.",
  },
}

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "" },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Saved from the bill photo." },
}
