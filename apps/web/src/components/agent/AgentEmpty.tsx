import { MessageCircleIcon } from "lucide-react"

import { SUGGESTIONS } from "@/components/agent/agent-copy"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

export function AgentEmpty() {
  const { chat } = useAgentPanel()

  return (
    <Empty className="flex-1 justify-center border-0 px-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircleIcon />
        </EmptyMedia>
        <EmptyTitle>Ask about your spending</EmptyTitle>
        <EmptyDescription>
          Answers come from your confirmed bills. Nothing is changed from chat.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="w-full max-w-none gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            className="w-full justify-start font-normal"
            key={suggestion}
            onClick={() => void chat.send(suggestion)}
            size="sm"
            variant="outline"
          >
            {suggestion}
          </Button>
        ))}
      </EmptyContent>
    </Empty>
  )
}
