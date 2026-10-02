import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import type { SpendAnalytics } from "@/api/spend-items/spend-items.types"
import {
  BUCKET_LABELS,
  formatBucketLabel,
  formatBucketTick,
  formatCompactMoney,
} from "@/components/spending-analytics/analytics-format"
import { formatMoney } from "@/components/spending/spending-formatters"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const config = {
  total: { label: "Spent", color: "var(--chart-1)" },
} satisfies ChartConfig

type TrendChartProps = {
  data: SpendAnalytics
  periodLabel: string
  className?: string
}

export function TrendChart({ data, periodLabel, className }: TrendChartProps) {
  const points = data.trend.map((point) => ({
    start: point.start,
    total: Number(point.total),
  }))
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending over time</CardTitle>
        <CardDescription>
          {BUCKET_LABELS[data.bucket]} · {periodLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-64 flex-1 flex-col">
        <ChartContainer
          className="aspect-auto min-h-64 w-full flex-1"
          config={config}
        >
          <AreaChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="start"
              minTickGap={24}
              tickFormatter={(value: string) =>
                formatBucketTick(value, data.bucket)
              }
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value: number) =>
                formatCompactMoney(value, data.currency)
              }
              tickLine={false}
              width={52}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium tabular-nums">
                      {formatMoney(Number(value), data.currency)}
                    </span>
                  )}
                  hideIndicator
                  labelFormatter={(_, payload) =>
                    formatBucketLabel(
                      String(payload[0]?.payload?.start ?? ""),
                      data.bucket
                    )
                  }
                />
              }
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Area
              activeDot={{ r: 4, strokeWidth: 0 }}
              dataKey="total"
              fill="url(#trend-fill)"
              stroke="var(--color-total)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
