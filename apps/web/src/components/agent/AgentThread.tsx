import axios from "axios"
import { CircleAlertIcon } from "lucide-react"
import { useEffect, type ReactNode } from "react"

import type { MessagePublic } from "@/api/agent/agent.types"
import { AgentBillCard } from "@/components/agent/AgentBillCard"
import { AgentEmpty } from "@/components/agent/AgentEmpty"
import { AgentMessage } from "@/components/agent/AgentMessage"
import {
  FAILED_REPLY,
  READING_BILLS,
  toolLabel,
} from "@/components/agent/agent-copy"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"
import { useConversation } from "@/hooks/agent/use-conversation"

type FailureProps = {
  message: string
  onRetry?: () => void
}

function Failure({ message, onRetry }: FailureProps) {
  return (
    <Marker>
      <MarkerIcon>
        <CircleAlertIcon />
      </MarkerIcon>
      <MarkerContent>{message}</MarkerContent>
      {onRetry ? (
        <Button className="ml-auto" onClick={onRetry} size="xs" variant="ghost">
          Retry
        </Button>
      ) : null}
    </Marker>
  )
}

function Working({ label }: { label: string }) {
  return (
    <Marker aria-live="polite">
      <MarkerContent className="shimmer">{label}…</MarkerContent>
    </Marker>
  )
}

/** An attached bill is still being read; the reply waits for it. */
function reading(documents: Record<string, string>): boolean {
  return Object.values(documents).some(
    (status) => status === "uploaded" || status === "processing"
  )
}

/** A user message whose reply failed and that no reply follows. */
function unanswered(messages: MessagePublic[], index: number): boolean {
  const message = messages[index]
  return (
    message.role === "user" &&
    message.status === "failed" &&
    messages[index + 1]?.role !== "assistant"
  )
}

/**
 * Saved messages without the turn being sent. The server saves the question
 * (status "running") before the reply streams; a refetch in that window would
 * otherwise show it twice, once saved and once as the pending turn.
 */
function withoutTurnInFlight(messages: MessagePublic[]): MessagePublic[] {
  const index = messages.findLastIndex(
    (m) => m.role === "user" && m.status === "running"
  )
  return index === -1 ? messages : messages.slice(0, index)
}

type FollowLatestProps = {
  /** Changes whenever something new lands at the end of the thread. */
  signal: string
}

/**
 * Scrolls to the newest item when the user adds something (a message, a scan)
 * or a reply or card appears.
 *
 * No item in the thread is a `scrollAnchor`: when one item was swapped for
 * another (a scan for its pending turn), the scroller jumped to the first
 * anchor it hadn't handled yet, an old question near the top.
 */
function FollowLatest({ signal }: FollowLatestProps) {
  const { scrollToEnd } = useMessageScroller()

  useEffect(() => {
    scrollToEnd({ behavior: "smooth" })
  }, [signal, scrollToEnd])

  return null
}

type AgentThreadProps = {
  /** Shown when the chat has no messages yet. */
  empty?: ReactNode
  /** Items after the messages (phone scans); null keeps the empty state. */
  extra?: ReactNode
  /** How many extra items there are, so the thread follows new ones. */
  extraCount?: number
}

export function AgentThread({
  empty = <AgentEmpty />,
  extra = null,
  extraCount = 0,
}: AgentThreadProps) {
  const { conversationId, chat, forgetConversation } = useAgentPanel()
  const conversation = useConversation(conversationId)
  const turn = chat.turn
  const missing =
    axios.isAxiosError(conversation.error) &&
    conversation.error.response?.status === 404

  // A remembered chat can vanish (another account on this browser): start fresh.
  useEffect(() => {
    if (missing) forgetConversation()
  }, [missing, forgetConversation])

  const saved = conversation.data?.messages ?? []
  const messages = turn ? withoutTurnInFlight(saved) : saved
  if (!turn && conversationId && conversation.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4" aria-busy="true">
        <Skeleton className="ml-auto h-9 w-2/3" />
        <Skeleton className="h-16 w-5/6" />
      </div>
    )
  }
  if (!turn && messages.length === 0 && !extra) return empty

  const last = messages.at(-1)
  const stillRunning =
    !turn && last?.role === "user" && last.status === "running"

  const latest = [
    messages.at(-1)?.id ?? "",
    turn ? "turn" : "",
    turn?.actions.length ?? 0,
    turn?.reply ? "reply" : "",
    extraCount,
  ].join(":")

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <FollowLatest signal={latest} />
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-5 px-4 py-4">
            {messages.map((message, index) => (
              <MessageScrollerItem key={message.id} messageId={message.id}>
                <div className="flex flex-col gap-3">
                  <AgentMessage
                    content={message.content}
                    documentIds={message.document_ids}
                    role={message.role}
                  />
                  {message.actions.map((action) => (
                    <AgentBillCard action={action} key={action.document_id} />
                  ))}
                  {unanswered(messages, index) ? (
                    <Failure
                      message={FAILED_REPLY}
                      onRetry={
                        turn?.streaming
                          ? undefined
                          : () =>
                              void chat.send(
                                message.content,
                                message.document_ids
                              )
                      }
                    />
                  ) : null}
                </div>
              </MessageScrollerItem>
            ))}
            {stillRunning ? (
              <MessageScrollerItem messageId="running">
                <Working label={toolLabel(null)} />
              </MessageScrollerItem>
            ) : null}
            {turn ? (
              <MessageScrollerItem messageId={turn.id}>
                <div className="flex flex-col gap-3">
                  <AgentMessage
                    content={turn.text}
                    documentIds={turn.documentIds}
                    role="user"
                  />
                  {turn.actions.map((action) => (
                    <AgentBillCard action={action} key={action.document_id} />
                  ))}
                  {turn.reply ? (
                    <AgentMessage content={turn.reply} role="assistant" />
                  ) : turn.streaming ? (
                    <Working
                      label={
                        reading(turn.documents)
                          ? READING_BILLS
                          : toolLabel(turn.tool)
                      }
                    />
                  ) : null}
                  {turn.error ? (
                    <Failure
                      message={turn.error}
                      onRetry={() =>
                        void chat.send(turn.text, turn.documentIds)
                      }
                    />
                  ) : null}
                </div>
              </MessageScrollerItem>
            ) : null}
            {extra}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
