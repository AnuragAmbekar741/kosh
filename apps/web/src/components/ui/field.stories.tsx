import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Core/Forms/Field",
  component: Field,
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["vertical", "horizontal", "responsive"],
    },
  },
  args: { orientation: "vertical" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field {...args}>
      <FieldLabel htmlFor="merchant">Merchant</FieldLabel>
      <Input id="merchant" placeholder="Nature's Basket" />
      <FieldDescription>As printed at the top of the bill.</FieldDescription>
    </Field>
  ),
}

export const Invalid: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="amount">Amount</FieldLabel>
      <Input aria-invalid id="amount" inputMode="decimal" defaultValue="12,0" />
      <FieldError>Enter an amount like 120.50.</FieldError>
    </Field>
  ),
}

/** `errors` takes validation messages (e.g. from react-hook-form + zod). */
export const ErrorList: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="spent-at">Bill date</FieldLabel>
      <Input aria-invalid id="spent-at" type="date" />
      <FieldError
        errors={[
          { message: "Pick a date." },
          { message: "The date can't be in the future." },
        ]}
      />
    </Field>
  ),
}

export const Horizontal: Story = {
  args: { orientation: "horizontal" },
  render: (args) => (
    <Field {...args}>
      <FieldContent>
        <FieldTitle>Monthly budget</FieldTitle>
        <FieldDescription>Used for the overview ring.</FieldDescription>
      </FieldContent>
      <Input
        aria-label="Monthly budget"
        className="w-28"
        defaultValue="25000"
      />
    </Field>
  ),
}

/** A whole form: FieldSet + FieldLegend + FieldGroup + FieldSeparator. */
export const Form: Story = {
  render: () => (
    <form className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend>Add spending</FieldLegend>
        <FieldDescription>
          Line text stays exactly as it reads on the bill.
        </FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="form-merchant">Merchant</FieldLabel>
            <Input id="form-merchant" placeholder="Swiggy" />
          </Field>
          <Field>
            <FieldLabel htmlFor="form-amount">Amount</FieldLabel>
            <Input id="form-amount" inputMode="decimal" placeholder="0.00" />
          </Field>
          <FieldSeparator>Optional</FieldSeparator>
          <Field>
            <FieldLabel htmlFor="form-note">Note</FieldLabel>
            <Textarea id="form-note" placeholder="Split with Priya" />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit">Save bill</Button>
    </form>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <Field {...args} data-disabled>
      <FieldLabel htmlFor="currency">Currency</FieldLabel>
      <Input disabled id="currency" defaultValue="INR" />
      <FieldDescription>Set from your first bill.</FieldDescription>
    </Field>
  ),
}
