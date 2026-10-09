import { formatDistanceToNowStrict } from "date-fns"
import { MessagesSquareIcon } from "lucide-react"

import type { ConversationPublic } from "@/api/agent/agent.types"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"
import { useConversations } from "@/hooks/agent/use-conversations"

/** The API sends UTC timestamps without an offset; read them as UTC. */
function fromApi(timestamp: string): Date {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
  return new Date(hasOffset ? timestamp : `${timestamp}Z`)
}

type HistoryRowProps = {
  conversation: ConversationPublic
  current: boolean
  onOpen: () => void
}

function HistoryRow({ conversation, current, onOpen }: HistoryRowProps) {
  return (
    <li>
      <Button
        aria-current={current ? "true" : undefined}
        className="h-auto w-full justify-between gap-3 py-2.5 font-normal aria-[current=true]:bg-accent"
        onClick={onOpen}
        variant="ghost"
      >
        <span className="truncate">
          {conversation.title ?? "Untitled chat"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDistanceToNowStrict(fromApi(conversation.updated_at), {
            addSuffix: true,
          })}
        </span>
      </Button>
    </li>
  )
}

export function AgentHistory() {
  const { conversationId, openConversation } = useAgentPanel()
  const conversations = useConversations(true)

  if (conversations.isPending) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  const rows = conversations.data?.data ?? []
  if (rows.length === 0) {
    return (
      <Empty className="flex-1 justify-center border-0 px-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquareIcon />
          </EmptyMedia>
          <EmptyTitle>No chats yet</EmptyTitle>
          <EmptyDescription>
            Your conversations will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className="flex min-h-0 flex-1 scrollbar-thin flex-col gap-0.5 overflow-y-auto p-2">
      {rows.map((conversation) => (
        <HistoryRow
          conversation={conversation}
          current={conversation.id === conversationId}
          key={conversation.id}
          onOpen={() => openConversation(conversation.id)}
        />
      ))}
    </ul>
  )
}
