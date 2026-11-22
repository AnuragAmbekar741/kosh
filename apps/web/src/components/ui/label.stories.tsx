import type { Meta, StoryObj } from "@storybook/react-vite"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const meta = {
  title: "Core/Forms/Label",
  component: Label,
  args: { children: "Merchant" },
} satisfies Meta<typeof Label>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Prefer `Field` + `FieldLabel` in forms; `Label` is for one-off controls. */
export const WithInput: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-2">
      <Label {...args} htmlFor="label-merchant" />
      <Input id="label-merchant" placeholder="Nature's Basket" />
    </div>
  ),
}

export const DisabledPeer: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col-reverse gap-2">
      <Input className="peer" disabled id="label-currency" defaultValue="INR" />
      <Label {...args} htmlFor="label-currency">
        Currency
      </Label>
    </div>
  ),
}
