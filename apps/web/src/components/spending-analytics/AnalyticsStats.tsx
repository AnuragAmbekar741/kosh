import type { ReactNode } from "react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import type { SpendAnalytics } from "@/api/spend-items/spend-items.types"
import { categoryColor } from "@/components/spending/categories"
import { rangeLabel } from "@/components/spending/spend-period"
import { formatMoney } from "@/components/spending/spending-formatters"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: ReactNode
  footnote: ReactNode
}

function StatCard({ label, value, footnote }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {footnote}
        </span>
      </CardContent>
    </Card>
  )
}

function Comparison({
  comparison,
  periodLabel,
}: {
  comparison: SpendAnalytics["comparison"]
  periodLabel: string
}) {
  if (!comparison) return periodLabel
  const previous = rangeLabel({
    from: comparison.previous_from,
    to: comparison.previous_to,
  })
  if (comparison.delta_percent === null) return `Nothing spent ${previous}`
  const up = comparison.delta_percent > 0
  const Icon = up ? TrendingUpIcon : TrendingDownIcon
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular-nums",
          up ? "text-destructive" : "text-chart-2"
        )}
      >
        <Icon className="size-3.5" />
        {Math.abs(comparison.delta_percent).toFixed(0)}%
      </span>
      vs {previous}
    </span>
  )
}

type AnalyticsStatsProps = {
  data: SpendAnalytics
  periodLabel: string
}

export function AnalyticsStats({ data, periodLabel }: AnalyticsStatsProps) {
  const top = data.categories[0]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        footnote={
          <Comparison comparison={data.comparison} periodLabel={periodLabel} />
        }
        label="Total spent"
        value={formatMoney(data.total, data.currency)}
      />
      <StatCard
        footnote={`${data.item_count} item${data.item_count === 1 ? "" : "s"}`}
        label="Bills"
        value={data.bill_count}
      />
      <StatCard
        footnote={`${formatMoney(data.daily_average, data.currency)} a day`}
        label="Average bill"
        value={formatMoney(data.avg_per_bill, data.currency)}
      />
      <StatCard
        footnote={
          top
            ? `${Math.round(top.share * 100)}% · ${formatMoney(top.total, data.currency)}`
            : "No spend yet"
        }
        label="Top category"
        value={
          top ? (
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: categoryColor(top.category) }}
              />
              <span className="truncate">{top.category}</span>
            </span>
          ) : (
            "—"
          )
        }
      />
    </div>
  )
}
