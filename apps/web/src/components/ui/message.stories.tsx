import type { Meta, StoryObj } from "@storybook/react-vite"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"

const meta = {
  title: "Core/Chat/Message",
  component: Message,
  args: {
    align: "start",
  },
  argTypes: {
    align: { control: "inline-radio", options: ["start", "end"] },
  },
  decorators: [
    (Story) => (
      <div className="w-[min(100vw-2rem,28rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Message>

export default meta

type Story = StoryObj<typeof meta>

/** The user's message: right-aligned, in a secondary bubble. */
export const User: Story = {
  args: { align: "end" },
  render: (args) => (
    <Message {...args}>
      <MessageContent className="items-end gap-2">
        <Bubble align="end" variant="secondary">
          <BubbleContent className="whitespace-pre-wrap">
            How much did I spend on groceries this month?
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  ),
}

/** Kosh's reply: left-aligned, no bubble chrome. */
export const Assistant: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent className="flex flex-col gap-2 tabular-nums">
            <p>
              You've spent <strong className="font-medium">₹7,240.30</strong> on
              groceries in November, across 6 bills.
            </p>
            <p>Most of it was at Nature's Basket (₹6,120.00).</p>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  ),
}

export const WithHeaderAndFooter: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <MessageHeader>Kosh</MessageHeader>
        <Bubble variant="muted">
          <BubbleContent>
            I read 5 items from the bill. Save them?
          </BubbleContent>
        </Bubble>
        <MessageFooter>10:24</MessageFooter>
      </MessageContent>
    </Message>
  ),
}

export const Conversation: Story = {
  render: () => (
    <MessageGroup className="gap-5">
      <Message align="end">
        <MessageContent className="items-end">
          <Bubble align="end" variant="secondary">
            <BubbleContent>
              Add 68 for milk at Nature's Basket today
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="start">
        <MessageContent>
          <Bubble variant="ghost">
            <BubbleContent>
              Got it: ₹68.00 for toned milk at Nature's Basket, today. Which
              category should it go under?
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageGroup>
  ),
}
