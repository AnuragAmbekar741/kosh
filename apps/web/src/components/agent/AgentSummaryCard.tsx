import { ChevronRightIcon } from "lucide-react"
import { Link } from "react-router"

import { formatMoney } from "@/components/spending/spending-formatters"
import { currentMonthRange } from "@/components/spending/spend-period"
import { Skeleton } from "@/components/ui/skeleton"
import { useReviewCount } from "@/hooks/documents/use-review-count"
import { useSpendSummary } from "@/hooks/spend-items/use-spend-items"

const monthName = new Intl.DateTimeFormat(undefined, { month: "long" })

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/** Phone chat home: this month's total, bill count, and bills to review. */
export function AgentSummaryCard() {
  const range = currentMonthRange()
  const summary = useSpendSummary({
    spent_from: range.from,
    spent_to: range.to,
    period: "month",
  })
  const toReview = useReviewCount()
  const data = summary.data

  return (
    <Link
      className="group flex items-center gap-3 rounded-2xl glass px-4 py-3.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:animate-rise"
      to="/spending/bills?date=this-month"
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-xs text-muted-foreground">
          {monthName.format(new Date())} so far
        </span>
        {data ? (
          <span className="text-[26px] leading-tight font-medium tracking-tight tabular-nums">
            {formatMoney(data.total, data.currency)}
          </span>
        ) : (
          <Skeleton className="my-1 h-6 w-28" />
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {data ? plural(data.bill_count, "bill", "bills") : " "}
          {toReview ? (
            <span className="text-foreground">
              {" · "}
              {toReview} to review
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  )
}
