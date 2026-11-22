import type { Meta, StoryObj } from "@storybook/react-vite"
import { MoreHorizontalIcon } from "lucide-react"
import { fn } from "storybook/test"

import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

const SIZES = ["default", "sm"] as const

const meta = {
  title: "Core/Layout/Card",
  component: Card,
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
  args: { size: "default" },
  render: (args) => (
    <Card {...args} className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>November so far</CardTitle>
        <CardDescription>23 bills · 141 items</CardDescription>
        <CardAction>
          <Button
            aria-label="More"
            onClick={fn()}
            size="icon-sm"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-medium tabular-nums">₹18,432.75</p>
        <p className="text-xs text-muted-foreground">8.4% less than October</p>
      </CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: "sm" } }

export const WithFooter: Story = {
  render: (args) => (
    <Card {...args} className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>Save this bill?</CardTitle>
        <CardDescription>Nature’s Basket · 18 Nov</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="tabular-nums">5 lines · ₹736.00</p>
      </CardContent>
      <CardFooter className="gap-2 border-t py-3">
        <Button onClick={fn()} size="sm">
          Save
        </Button>
        <Button onClick={fn()} size="sm" variant="ghost">
          Discard
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const LongText: Story = {
  render: (args) => (
    <Card {...args} className="w-[280px] max-w-full">
      <CardHeader>
        <CardTitle>
          Heads Up For Tails, 100 Feet Road, Indiranagar, Bengaluru
        </CardTitle>
        <CardDescription>
          Statement import from HDFC Millennia credit card, 1 Oct – 31 Oct 2026
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="tabular-nums">₹1,24,980.50</p>
      </CardContent>
    </Card>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {SIZES.map((size) => (
        <Card key={size} className="w-64" size={size}>
          <CardHeader>
            <CardTitle>size="{size}"</CardTitle>
            <CardDescription>Groceries this month</CardDescription>
          </CardHeader>
          <CardContent className="tabular-nums">₹7,240.30</CardContent>
        </Card>
      ))}
    </div>
  ),
}
