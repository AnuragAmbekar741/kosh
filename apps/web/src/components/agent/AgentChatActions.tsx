import { ArrowLeftIcon, HistoryIcon, SquarePenIcon } from "lucide-react"

import { AgentHeaderButton } from "@/components/agent/AgentHeaderButton"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

/** Header buttons for the phone chat page: past chats and a new chat. */
export function AgentChatActions() {
  const { view, setView, openConversation, chat } = useAgentPanel()

  return (
    <>
      {view === "history" ? (
        <AgentHeaderButton
          icon={ArrowLeftIcon}
          label="Back to chat"
          onClick={() => setView("thread")}
        />
      ) : (
        <AgentHeaderButton
          icon={HistoryIcon}
          label="Past chats"
          onClick={() => setView("history")}
        />
      )}
      <AgentHeaderButton
        disabled={Boolean(chat.turn?.streaming)}
        icon={SquarePenIcon}
        label="New chat"
        onClick={() => openConversation(null)}
      />
    </>
  )
}
