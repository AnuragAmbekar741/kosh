import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/components/ui/bubble"

const VARIANTS = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const

const meta = {
  title: "Core/Chat/Bubble",
  component: Bubble,
  args: {
    variant: "default",
    align: "start",
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    align: { control: "inline-radio", options: ["start", "end"] },
  },
  decorators: [
    (Story) => (
      <div className="flex w-[min(100vw-2rem,28rem)] flex-col">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Bubble {...args}>
      <BubbleContent>Saved 5 items from Nature's Basket.</BubbleContent>
    </Bubble>
  ),
} satisfies Meta<typeof Bubble>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = { args: { variant: "secondary" } }

export const Muted: Story = { args: { variant: "muted" } }

export const Tinted: Story = { args: { variant: "tinted" } }

export const Outline: Story = { args: { variant: "outline" } }

export const Ghost: Story = { args: { variant: "ghost" } }

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Bubble {...args}>
      <BubbleContent>
        Couldn't read this photo. Try a sharper one.
      </BubbleContent>
    </Bubble>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <BubbleGroup className="gap-3">
      {VARIANTS.map((variant, index) => (
        <Bubble
          key={variant}
          align={index % 2 ? "end" : "start"}
          variant={variant}
        >
          <BubbleContent>
            {variant}: ₹{(index + 1) * 120}.00 at Swiggy
          </BubbleContent>
        </Bubble>
      ))}
    </BubbleGroup>
  ),
}

export const WithReactions: Story = {
  render: (args) => (
    <Bubble {...args} className="mb-4">
      <BubbleContent>November is 8% under October so far.</BubbleContent>
      <BubbleReactions>🎉</BubbleReactions>
    </Bubble>
  ),
}

export const LongText: Story = {
  args: { variant: "secondary", align: "end" },
  render: (args) => (
    <Bubble {...args}>
      <BubbleContent>
        NESTLE EVERYDAY DAIRY WHITENER POUCH 400G + FREE 50G PROMO PACK (LIMITED
        EDITION) was ₹1,249.50 — is that right, or did the shop charge me twice?
      </BubbleContent>
    </Bubble>
  ),
}
