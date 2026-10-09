import Markdown from "react-markdown"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

type AgentMessageProps = {
  role: "user" | "assistant"
  content: string
}

// Replies may use bold and lists. Raw HTML is never rendered; anything else
// (headings, tables, images) collapses to its text.
const REPLY_ELEMENTS = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "br",
]

export function AgentMessage({ role, content }: AgentMessageProps) {
  if (role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="secondary">
            <BubbleContent className="whitespace-pre-wrap">
              {content}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }
  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent className="flex flex-col gap-2 tabular-nums [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-5">
            <Markdown
              allowedElements={REPLY_ELEMENTS}
              components={{
                a: ({ href, children }) => (
                  <a href={href} rel="noreferrer noopener" target="_blank">
                    {children}
                  </a>
                ),
              }}
              unwrapDisallowed
            >
              {content}
            </Markdown>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}
