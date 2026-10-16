import { MessageCircleIcon, XIcon } from "lucide-react"
import type { Ref } from "react"

import { Button } from "@/components/ui/button"
import { AGENT_PANEL_ID } from "@/hooks/agent/use-agent-panel"

type AgentLauncherProps = {
  open: boolean
  onToggle: () => void
  buttonRef: Ref<HTMLButtonElement>
}

export function AgentLauncher({
  open,
  onToggle,
  buttonRef,
}: AgentLauncherProps) {
  return (
    <Button
      aria-controls={AGENT_PANEL_ID}
      aria-expanded={open}
      aria-label={open ? "Close assistant" : "Open assistant"}
      className="fixed right-6 bottom-6 z-40"
      onClick={onToggle}
      ref={buttonRef}
      size="icon-lg"
    >
      {open ? <XIcon /> : <MessageCircleIcon />}
    </Button>
  )
}
