import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeftIcon,
  HistoryIcon,
  MessageCircleIcon,
  SquarePenIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef } from "react"

import { AgentComposer } from "@/components/agent/AgentComposer"
import { AgentHeaderButton } from "@/components/agent/AgentHeaderButton"
import { AgentHistory } from "@/components/agent/AgentHistory"
import { AgentThread } from "@/components/agent/AgentThread"
import { AGENT_PANEL_ID, useAgentPanel } from "@/hooks/agent/use-agent-panel"

const EASE_OUT = [0.16, 1, 0.3, 1] as const

type AgentPanelProps = {
  onClose: () => void
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { view, setView, openConversation, chat } = useAgentPanel()
  const reduceMotion = useReducedMotion()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = Boolean(chat.turn?.streaming)

  // Opening the panel or returning to the thread puts the caret in the composer.
  useEffect(() => {
    if (view === "thread") inputRef.current?.focus()
  }, [view])

  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-labelledby="agent-panel-title"
      className="fixed right-6 bottom-[4.75rem] z-40 flex h-[min(40rem,calc(100svh-6.5rem))] w-[25rem] origin-bottom-right flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
      exit={{
        opacity: 0,
        scale: reduceMotion ? 1 : 0.98,
        y: reduceMotion ? 0 : 8,
      }}
      id={AGENT_PANEL_ID}
      initial={{
        opacity: 0,
        scale: reduceMotion ? 1 : 0.98,
        y: reduceMotion ? 0 : 8,
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose()
      }}
      role="dialog"
      transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: EASE_OUT }}
    >
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        {view === "history" ? (
          <AgentHeaderButton
            icon={ArrowLeftIcon}
            label="Back to chat"
            onClick={() => setView("thread")}
          />
        ) : (
          <span className="flex size-8 items-center justify-center text-muted-foreground">
            <MessageCircleIcon className="size-4" />
          </span>
        )}
        <h2 className="flex-1 truncate font-medium" id="agent-panel-title">
          {view === "history" ? "Chats" : "Assistant"}
        </h2>
        {view === "thread" ? (
          <AgentHeaderButton
            icon={HistoryIcon}
            label="Past chats"
            onClick={() => setView("history")}
          />
        ) : null}
        <AgentHeaderButton
          disabled={busy}
          icon={SquarePenIcon}
          label="New chat"
          onClick={() => openConversation(null)}
        />
        <AgentHeaderButton icon={XIcon} label="Close" onClick={onClose} />
      </header>
      {view === "history" ? (
        <AgentHistory />
      ) : (
        <>
          <AgentThread />
          <AgentComposer inputRef={inputRef} />
        </>
      )}
    </motion.section>
  )
}
