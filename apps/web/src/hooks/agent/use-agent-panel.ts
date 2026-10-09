import { createContext, useContext, useState } from "react"

import { useSendMessage } from "@/hooks/agent/use-send-message"

const STORAGE_KEY = "kosh.agent.conversation"

export const AGENT_PANEL_ID = "agent-panel"

export type AgentView = "thread" | "history"

function readConversation(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeConversation(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Remembering the last chat is a convenience; private windows may refuse.
  }
}

/** Widget state: owned once by AgentWidget, read by its parts via context. */
export function useAgentPanelState() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<AgentView>("thread")
  const [conversationId, setConversationId] = useState(readConversation)

  function selectConversation(id: string | null) {
    setConversationId(id)
    writeConversation(id)
  }

  const chat = useSendMessage({
    conversationId,
    onConversation: selectConversation,
  })

  function openConversation(id: string | null) {
    if (chat.turn?.streaming) return
    chat.clear()
    selectConversation(id)
    setView("thread")
  }

  return {
    open,
    setOpen,
    view,
    setView,
    conversationId,
    openConversation,
    forgetConversation: () => selectConversation(null),
    chat,
  }
}

export type AgentPanelState = ReturnType<typeof useAgentPanelState>

export const AgentPanelContext = createContext<AgentPanelState | null>(null)

export function useAgentPanel(): AgentPanelState {
  const value = useContext(AgentPanelContext)
  if (!value) throw new Error("useAgentPanel must be used inside AgentWidget")
  return value
}
