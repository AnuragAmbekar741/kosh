import { AgentSummaryCard } from "@/components/agent/AgentSummaryCard"
import { SUGGESTIONS } from "@/components/agent/agent-copy"
import { Button } from "@/components/ui/button"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

/** The phone chat page before the first message: summary on top, suggestions by the composer. */
export function AgentHome() {
  const { chat } = useAgentPanel()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <AgentSummaryCard />
      <p className="mt-auto text-center text-sm text-balance text-muted-foreground">
        Ask about your spending. Answers come from your confirmed bills.
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            className="h-auto rounded-full py-2 text-left font-normal whitespace-normal"
            key={suggestion}
            onClick={() => void chat.send(suggestion)}
            size="sm"
            variant="outline"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}
