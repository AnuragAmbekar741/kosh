import { useEffect } from "react"
import { Navigate } from "react-router"

import { AgentComposer } from "@/components/agent/AgentComposer"
import { AgentHistory } from "@/components/agent/AgentHistory"
import { AgentHome } from "@/components/agent/AgentHome"
import { AgentScans } from "@/components/agent/AgentScans"
import { AgentThread } from "@/components/agent/AgentThread"
import { ChatBackdrop } from "@/components/agent/ChatBackdrop"
import { PhoneNav } from "@/components/layout/navigation/PhoneNav"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"
import { useChatScans } from "@/hooks/agent/use-chat-scans"
import { useIsMobile } from "@/hooks/use-mobile"

/** Desktop keeps the floating panel: open it over Overview instead. */
function OpenPanelOnOverview() {
  const { setOpen } = useAgentPanel()

  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  return <Navigate replace to="/overview" />
}

/** Phone home: the assistant, full screen under the header, over the waveform. */
export function ChatPage() {
  const isPhone = useIsMobile()
  const { view } = useAgentPanel()
  const { scans } = useChatScans()

  if (!isPhone) return <OpenPanelOnOverview />

  return (
    // Edge to edge: cancel the shell's page padding.
    <main className="relative -mx-4 flex min-h-0 flex-1 flex-col text-sm">
      <ChatBackdrop />
      {/* `relative` paints the content over the absolute backdrop. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {view === "history" ? (
          <>
            <AgentHistory />
            <PhoneNav placement="floating" />
          </>
        ) : (
          <>
            <AgentThread
              empty={<AgentHome />}
              extra={scans.length ? <AgentScans /> : null}
            />
            <AgentComposer
              leading={<PhoneNav placement="inline" />}
              variant="phone"
            />
          </>
        )}
      </div>
    </main>
  )
}
