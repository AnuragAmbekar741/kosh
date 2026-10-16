import { ArrowRightIcon } from "lucide-react"
import { Link } from "react-router"

import {
  STARTER_STEPS,
  type StarterStep,
} from "@/components/overview/overview-copy"
import { openAddSpending } from "@/components/spending/add-spending"

// Hover changes only the border and the arrow: no lift, shadow or inner motion.
const cardClass =
  "group/step flex gap-3.5 rounded-[14px] border bg-(--glass) px-[18px] pt-[18px] pb-4 text-left backdrop-blur-[14px] outline-none transition-colors duration-250 hover:border-ring/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 motion-reduce:transition-none"

type StepCardBodyProps = {
  number: number
  step: StarterStep
}

function StepCardBody({ number, step }: StepCardBodyProps) {
  return (
    <>
      <span className="grid size-6 shrink-0 place-items-center rounded-[7px] border text-xs text-muted-foreground tabular-nums">
        {number}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] leading-6 font-medium tracking-[-0.01em]">
          {step.title}
        </span>
        <span className="max-w-[36ch] text-[13.5px] leading-normal text-muted-foreground">
          {step.text}
        </span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium">
          {step.label}
          <ArrowRightIcon className="size-3.5 text-muted-foreground transition-[translate,color] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/step:translate-x-0.5 group-hover/step:text-foreground group-focus-visible/step:translate-x-0.5 group-focus-visible/step:text-foreground motion-reduce:transition-none" />
        </span>
      </span>
    </>
  )
}

function StepCard({ number, step }: StepCardBodyProps) {
  if ("to" in step) {
    return (
      <Link className={cardClass} to={step.to}>
        <StepCardBody number={number} step={step} />
      </Link>
    )
  }

  return (
    <button
      className={cardClass}
      onClick={() => openAddSpending(step.action)}
      type="button"
    >
      <StepCardBody number={number} step={step} />
    </button>
  )
}

/** Three plain links into the first-run path. */
export function StarterSteps() {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-4 @min-[900px]:grid-cols-3">
      {STARTER_STEPS.map((step, index) => (
        <StepCard key={step.id} number={index + 1} step={step} />
      ))}
    </div>
  )
}
