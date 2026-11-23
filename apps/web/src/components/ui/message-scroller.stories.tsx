import type { Meta, StoryObj } from "@storybook/react-vite"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type Turn = { id: string; role: "user" | "assistant"; text: string }

const THREAD: Turn[] = [
  { id: "1", role: "user", text: "What did I spend this week?" },
  {
    id: "2",
    role: "assistant",
    text: "₹4,310.00 across 7 bills. Dining out was the biggest share at ₹1,890.00.",
  },
  { id: "3", role: "user", text: "And on groceries?" },
  {
    id: "4",
    role: "assistant",
    text: "₹1,640.50, almost all at Nature's Basket.",
  },
  { id: "5", role: "user", text: "Add 229 for detergent at DMart today" },
  {
    id: "6",
    role: "assistant",
    text: "Saved ₹229.00 for detergent at DMart under Household.",
  },
  { id: "7", role: "user", text: "Which day do I spend the most?" },
  {
    id: "8",
    role: "assistant",
    text: "Saturdays: ₹4,310.00 on average, mostly dining out.",
  },
]

function TurnRow({ turn }: { turn: Turn }) {
  const mine = turn.role === "user"
  return (
    <Message align={mine ? "end" : "start"}>
      <MessageContent className={mine ? "items-end" : undefined}>
        <Bubble
          align={mine ? "end" : "start"}
          variant={mine ? "secondary" : "ghost"}
        >
          <BubbleContent>{turn.text}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

const meta = {
  title: "Core/Chat/MessageScroller",
  component: MessageScroller,
} satisfies Meta<typeof MessageScroller>

export default meta

type Story = StoryObj<typeof meta>

/** Opens at the newest message; scroll up to see the jump-to-end button. */
export const Thread: Story = {
  render: () => (
    <div className="flex h-96 w-[min(100vw-2rem,26rem)] flex-col rounded-xl border">
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-5 px-4 py-4">
              {THREAD.map((turn) => (
                <MessageScrollerItem key={turn.id}>
                  <TurnRow turn={turn} />
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  ),
}
