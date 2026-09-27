import type { SpendSummary } from "@/api/spend-items/spend-items.types"
import { formatMoney } from "@/components/spending/spending-formatters"
import { Skeleton } from "@/components/ui/skeleton"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { cn } from "@/lib/utils"

type SpendingSummaryProps = {
  summary: SpendSummary
}

function formatDelta(value: number) {
  const rounded = Math.round(value * 10) / 10
  const abs = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : Math.abs(rounded).toFixed(1)
  return `${rounded < 0 ? "−" : ""}${abs}%`
}

export function SpendingSummarySkeleton() {
  return (
    <div className="flex shrink-0 flex-col gap-3" role="status">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  )
}

export function SpendingSummary({ summary }: SpendingSummaryProps) {
  const filters = useSpendFilters()
  const billLabel = summary.bill_count === 1 ? "bill" : "bills"
  const itemLabel = summary.item_count === 1 ? "item" : "items"
  const muted = summary.total === "0.00"

  return (
    <section
      aria-label="Spending summary"
      className={cn("flex shrink-0 flex-col gap-3", muted && "opacity-70")}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatMoney(summary.total, summary.currency)}
        </p>
        <p className="text-sm text-muted-foreground">{filters.spentInLabel}</p>
        {summary.comparison ? (
          <p
            className={cn(
              "text-sm tabular-nums",
              summary.comparison.delta_percent < 0
                ? "text-destructive"
                : summary.comparison.delta_percent > 0
                  ? "text-chart-2"
                  : "text-muted-foreground"
            )}
          >
            {formatDelta(summary.comparison.delta_percent)} vs{" "}
            {summary.comparison.previous_label}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground tabular-nums">
          {summary.bill_count} {billLabel} · {summary.item_count} {itemLabel} ·{" "}
          {formatMoney(summary.avg_per_bill, summary.currency)} avg per bill
        </p>
      </div>
    </section>
  )
}
