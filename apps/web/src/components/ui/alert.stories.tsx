import type { Meta, StoryObj } from "@storybook/react-vite"
import { AlertTriangleIcon, CircleAlertIcon, InfoIcon } from "lucide-react"
import { fn } from "storybook/test"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert"
import { Button } from "./button"

const VARIANTS = ["default", "destructive", "warning"] as const

const meta = {
  title: "Core/Feedback/Alert",
  component: Alert,
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
  },
  args: { variant: "default" },
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Alert {...args}>
        <InfoIcon />
        <AlertTitle>Bills are read in the background</AlertTitle>
        <AlertDescription>
          You can keep adding receipts. We’ll let you know when they’re ready to
          review.
        </AlertDescription>
      </Alert>
    </div>
  ),
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Alert {...args}>
        <CircleAlertIcon />
        <AlertTitle>Couldn’t read this bill</AlertTitle>
        <AlertDescription>
          The photo is too blurry. Retake it in good light, or add the lines
          yourself.
        </AlertDescription>
      </Alert>
    </div>
  ),
}

export const Warning: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Alert {...args}>
        <AlertTriangleIcon />
        <AlertTitle>This might be a duplicate</AlertTitle>
        <AlertDescription>
          Nature’s Basket, 18 Nov, ₹736.00 is already in your ledger.
        </AlertDescription>
      </Alert>
    </div>
  ),
}

export const WithAction: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Alert {...args}>
        <AlertTriangleIcon />
        <AlertTitle>2 bills need your review</AlertTitle>
        <AlertDescription>
          Check the lines before they’re saved.
        </AlertDescription>
        <AlertAction>
          <Button onClick={fn()} size="xs" variant="outline">
            Review
          </Button>
        </AlertAction>
      </Alert>
    </div>
  ),
}

export const TitleOnly: Story = {
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Alert {...args}>
        <InfoIcon />
        <AlertTitle>Amounts are never summed across currencies.</AlertTitle>
      </Alert>
    </div>
  ),
}

export const LongText: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <div className="w-[320px] max-w-full">
      <Alert {...args}>
        <CircleAlertIcon />
        <AlertTitle>
          We couldn’t save the bill from Heads Up For Tails, Indiranagar
        </AlertTitle>
        <AlertDescription>
          The total on the receipt (₹1,412.00) doesn’t match the sum of its
          lines (₹1,389.00). Fix a line amount or add the missing line, then try
          saving again.
        </AlertDescription>
      </Alert>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex w-[420px] max-w-full flex-col gap-3">
      {VARIANTS.map((variant) => (
        <Alert key={variant} variant={variant}>
          <InfoIcon />
          <AlertTitle className="capitalize">{variant}</AlertTitle>
          <AlertDescription>Your October statement is ready.</AlertDescription>
        </Alert>
      ))}
    </div>
  ),
}
