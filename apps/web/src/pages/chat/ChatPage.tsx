import { useEffect } from "react"
import { Navigate } from "react-router"

import { AgentComposer } from "@/components/agent/AgentComposer"
import { AgentHistory } from "@/components/agent/AgentHistory"
import { AgentHome } from "@/components/agent/AgentHome"
import { AgentThread } from "@/components/agent/AgentThread"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"
import { useIsMobile } from "@/hooks/use-mobile"

/** Desktop keeps the floating panel: open it over Overview instead. */
function OpenPanelOnOverview() {
  const { setOpen } = useAgentPanel()

  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  return <Navigate replace to="/overview" />
}

/** Phone home: the assistant, full screen between the header and the tab bar. */
export function ChatPage() {
  const isPhone = useIsMobile()
  const { view } = useAgentPanel()

  if (!isPhone) return <OpenPanelOnOverview />

  return (
    // Edge to edge: cancel the shell's page padding.
    <main className="-mx-4 -mb-4 flex min-h-0 flex-1 flex-col text-sm">
      {view === "history" ? (
        <AgentHistory />
      ) : (
        <>
          <AgentThread empty={<AgentHome />} />
          <AgentComposer />
        </>
      )}
    </main>
  )
}
