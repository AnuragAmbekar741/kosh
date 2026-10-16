import {
  CalendarIcon,
  ChartNoAxesCombinedIcon,
  ReceiptTextIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { AgentSummaryCard } from "@/components/agent/AgentSummaryCard"
import { SUGGESTIONS } from "@/components/agent/agent-copy"
import { EmptyEyebrow } from "@/components/ui/empty"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

/** One per suggestion, in order: last month, this year, review. */
const SUGGESTION_ICONS: LucideIcon[] = [
  CalendarIcon,
  ChartNoAxesCombinedIcon,
  ReceiptTextIcon,
]

type SuggestionChipProps = {
  index: number
  question: string
  onAsk: (question: string) => void
}

function SuggestionChip({ index, question, onAsk }: SuggestionChipProps) {
  const Icon = SUGGESTION_ICONS[index] ?? SparklesIcon

  return (
    <button
      className="flex w-full items-center gap-2.5 rounded-[14px] glass px-3.5 py-2.5 text-left text-[13.5px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-(--glass-strong) motion-safe:animate-[rise_0.6s_cubic-bezier(0.2,0.8,0.2,1)_both,float_8s_ease-in-out_infinite]"
      onClick={() => onAsk(question)}
      // Stagger the rise; offset the float so the chips don't bob together.
      style={{ animationDelay: `${0.1 + index * 0.08}s, ${-index * 2.6}s` }}
      type="button"
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {question}
    </button>
  )
}

/** The phone chat page before the first message: summary, hero, suggestions. */
export function AgentHome() {
  const { chat } = useAgentPanel()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-1">
      <AgentSummaryCard />
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 py-2 text-center">
        <span className="mb-1.5 grid size-13 place-items-center rounded-2xl glass motion-safe:animate-float">
          <SparklesIcon aria-hidden className="size-5.5" />
        </span>
        <EmptyEyebrow>Your spending assistant</EmptyEyebrow>
        <h2 className="text-[22px] font-medium tracking-tight text-balance">
          Ask about your spending
        </h2>
        <p className="max-w-[30ch] text-[13.5px] leading-relaxed text-balance text-muted-foreground">
          Answers come from your confirmed bills. Nothing is changed from chat.
        </p>
      </div>
      <ul aria-label="Suggested questions" className="flex flex-col gap-2">
        {SUGGESTIONS.map((question, index) => (
          <li key={question}>
            <SuggestionChip
              index={index}
              onAsk={(next) => void chat.send(next)}
              question={question}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
