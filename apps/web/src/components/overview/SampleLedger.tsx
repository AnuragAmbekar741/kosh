import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MoonIcon, RotateCcwIcon } from "lucide-react"

import {
  LEDGER_COPY,
  SAMPLE_LINES,
  type SampleLine,
} from "@/components/overview/overview-copy"
import { CategoryBadge } from "@/components/spending/CategoryBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EASE = [0.2, 0.8, 0.2, 1] as const
const ROW_START = 0.3
const ROW_GAP = 0.38
const PATTERN_DELAY = ROW_START + SAMPLE_LINES.length * ROW_GAP + 0.4

type SampleRowProps = {
  index: number
  line: SampleLine
  reduceMotion: boolean
}

function SampleRow({ index, line, reduceMotion }: SampleRowProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="grid h-9 grid-cols-[48px_minmax(0,1fr)_auto_64px] items-center gap-3 border-b"
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      transition={{
        delay: ROW_START + index * ROW_GAP,
        duration: 0.5,
        ease: EASE,
      }}
    >
      <span className="text-[12.5px] text-muted-foreground tabular-nums">
        {line.date}
      </span>
      <span
        className={cn(
          "truncate",
          line.highlight &&
            "underline decoration-ring decoration-1 underline-offset-4"
        )}
      >
        {line.name}
      </span>
      <CategoryBadge category={line.category} />
      <span className="text-right tabular-nums">{line.amount}</span>
    </motion.div>
  )
}

/** Static example rows that write in once, plus the habit they reveal. */
export function SampleLedger() {
  const reduceMotion = useReducedMotion() ?? false
  const [play, setPlay] = useState(0)

  return (
    <div className="w-full max-w-[520px] text-[13.5px] @min-[900px]:justify-self-end">
      <div className="rounded-2xl glass px-4 pt-1.5 pb-3.5">
        <div className="flex h-9 items-center justify-between border-b text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            {LEDGER_COPY.month}
            <span className="rounded-md border border-dashed px-[7px] py-px text-[11px]">
              {LEDGER_COPY.tag}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{SAMPLE_LINES.length} lines</span>
            <Button
              aria-label={LEDGER_COPY.replay}
              onClick={() => setPlay((count) => count + 1)}
              size="icon-xs"
              variant="ghost"
            >
              <RotateCcwIcon />
            </Button>
          </span>
        </div>
        <div key={play}>
          {SAMPLE_LINES.map((line, index) => (
            <SampleRow
              key={line.id}
              index={index}
              line={line}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
      <motion.div
        key={play}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3.5 flex items-center gap-3.5 rounded-xl glass px-4 py-[13px]"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        transition={{ delay: PATTERN_DELAY, duration: 0.6, ease: EASE }}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent">
          <MoonIcon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{LEDGER_COPY.pattern.title}</p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {LEDGER_COPY.pattern.detail}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
