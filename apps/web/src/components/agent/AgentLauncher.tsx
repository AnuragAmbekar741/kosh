import { MessageCircleIcon, XIcon } from "lucide-react"
import type { Ref } from "react"

import { Button } from "@/components/ui/button"
import { AGENT_PANEL_ID } from "@/hooks/agent/use-agent-panel"
import { cn } from "@/lib/utils"

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
      className={cn(
        "fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6",
        // Full-screen on phones: the panel's own close button replaces this one.
        open && "max-sm:hidden"
      )}
      onClick={onToggle}
      ref={buttonRef}
      size="icon-lg"
    >
      {open ? <XIcon /> : <MessageCircleIcon />}
    </Button>
  )
}
