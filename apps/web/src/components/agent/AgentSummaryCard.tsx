import { ChevronRightIcon } from "lucide-react"
import { Link } from "react-router"

import { formatMoney } from "@/components/spending/spending-formatters"
import { currentMonthRange } from "@/components/spending/spend-period"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocumentInbox } from "@/hooks/documents/use-documents"
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
  const inbox = useDocumentInbox()
  const toReview = (inbox.data ?? []).filter(
    (document) => document.status === "ready" && document.needs_review
  ).length
  const data = summary.data

  return (
    <Link
      className="group flex items-center gap-3 rounded-xl bg-muted/60 p-4 ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
      to="/spending/bills?date=this-month"
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-xs text-muted-foreground">
          {monthName.format(new Date())} so far
        </span>
        {data ? (
          <span className="text-2xl font-medium tabular-nums">
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
