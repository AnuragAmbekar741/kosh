import { AnimatePresence } from "framer-motion"
import { useRef } from "react"

import { AgentLauncher } from "@/components/agent/AgentLauncher"
import { AgentPanel } from "@/components/agent/AgentPanel"
import {
  AgentPanelContext,
  useAgentPanelState,
} from "@/hooks/agent/use-agent-panel"

/**
 * The assistant on every signed-in page: a launcher bottom-right and a
 * floating, non-modal panel. Mounted once in AppShell, so a reply keeps
 * streaming while the panel is closed or the user changes page.
 */
export function AgentWidget() {
  const state = useAgentPanelState()
  const launcherRef = useRef<HTMLButtonElement>(null)

  function close() {
    state.setOpen(false)
    launcherRef.current?.focus()
  }

  return (
    <AgentPanelContext.Provider value={state}>
      <AnimatePresence>
        {state.open ? <AgentPanel onClose={close} /> : null}
      </AnimatePresence>
      <AgentLauncher
        buttonRef={launcherRef}
        onToggle={() => (state.open ? close() : state.setOpen(true))}
        open={state.open}
      />
    </AgentPanelContext.Provider>
  )
}
