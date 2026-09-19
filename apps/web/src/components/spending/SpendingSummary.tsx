import { CheckIcon } from "lucide-react"

import type { SpendSummary } from "@/api/spend-items/spend-items.types"
import {
  categorySwatchClass,
  categoryTintClass,
} from "@/components/spending/CategoryBadge"
import { formatMoney } from "@/components/spending/spending-formatters"
import { Badge } from "@/components/ui/badge"
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

function MixBar({
  categories,
  selected,
  total,
}: {
  categories: SpendSummary["categories"]
  selected: string[]
  total: string
}) {
  const denom = Number(total)
  const shown = selected.length
    ? categories.filter((category) => selected.includes(category.name))
    : categories
  const summary = shown
    .map((category) => `${category.name} ${category.percent}%`)
    .join(", ")

  if (denom <= 0 || shown.length === 0) {
    return (
      <div
        aria-label="No category mix"
        className="h-2 w-full rounded-full bg-muted"
      />
    )
  }

  return (
    <div
      aria-label={`Category mix: ${summary}`}
      className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
      role="img"
    >
      {shown.map((category) => (
        <span
          className={cn("h-full", categorySwatchClass(category.name))}
          key={category.name}
          style={{ width: `${(Number(category.amount) / denom) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function SpendingSummarySkeleton() {
  return (
    <div className="flex shrink-0 flex-col gap-3" role="status">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
    </div>
  )
}

export function SpendingSummary({ summary }: SpendingSummaryProps) {
  const filters = useSpendFilters()
  const selected = filters.categories
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
      <MixBar
        categories={summary.categories}
        selected={selected}
        total={summary.total}
      />
      {summary.categories.length ? (
        <div className="flex flex-wrap gap-2">
          {summary.categories.map((category) => {
            const isFiltered = selected.length > 0
            const isActive = !isFiltered || selected.includes(category.name)
            return (
              <button
                aria-pressed={isActive && isFiltered}
                className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={category.name}
                onClick={() => filters.toggleCategory(category.name)}
                type="button"
              >
                <Badge
                  className={cn(
                    isActive
                      ? categoryTintClass(category.name)
                      : "bg-muted text-muted-foreground",
                    isActive && isFiltered && "ring-1 ring-foreground/40"
                  )}
                  variant="outline"
                >
                  {isActive && isFiltered ? <CheckIcon /> : null}
                  {category.name}
                  <span className="tabular-nums">
                    {formatMoney(category.amount, summary.currency)} ·{" "}
                    {Math.round(category.percent)}%
                  </span>
                </Badge>
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
