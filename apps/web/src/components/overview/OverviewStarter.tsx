import { MessageCircleIcon, UploadIcon } from "lucide-react"

import { EngravedWordmark } from "@/components/overview/EngravedWordmark"
import { STARTER_COPY } from "@/components/overview/overview-copy"
import { SampleLedger } from "@/components/overview/SampleLedger"
import { StarterSteps } from "@/components/overview/StarterSteps"
import { openAddSpending } from "@/components/spending/add-spending"
import { Button } from "@/components/ui/button"
import { ContourRings } from "@/components/visuals/ContourRings"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

/** Slate mist with contour rings drifting in the top-right. */
function StarterBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-(image:--empty-wash)"
    >
      <ContourRings />
    </div>
  )
}

/**
 * Desktop Overview until real totals exist: what Kosh is, a sample of what
 * line-by-line bills reveal, and the three steps to get there.
 */
export function OverviewStarter() {
  const agent = useAgentPanel()

  return (
    <section className="@container relative min-h-0 flex-1 overflow-hidden">
      <StarterBackdrop />
      <div className="relative flex h-full flex-col gap-[22px] overflow-y-auto p-6 @min-[900px]:pt-7 @min-[900px]:pr-8 @min-[900px]:pb-7 @min-[900px]:pl-[52px]">
        <div className="grid flex-1 grid-cols-1 items-center gap-7 @min-[900px]:grid-cols-2 @min-[900px]:gap-14">
          <div className="flex flex-col gap-5">
            <EngravedWordmark />
            <p className="max-w-[46ch] text-[15px] leading-[1.6] text-pretty text-muted-foreground">
              {STARTER_COPY.lede.before}
              <span className="font-medium text-foreground">
                {STARTER_COPY.lede.emphasis}
              </span>
              {STARTER_COPY.lede.after}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={() => openAddSpending("upload")} size="lg">
                <UploadIcon data-icon="inline-start" />
                {STARTER_COPY.addBill}
              </Button>
              <Button
                onClick={() => agent.setOpen(true)}
                size="lg"
                variant="outline"
              >
                <MessageCircleIcon data-icon="inline-start" />
                {STARTER_COPY.askAssistant}
              </Button>
            </div>
          </div>
          <SampleLedger />
        </div>
        <StarterSteps />
      </div>
    </section>
  )
}
