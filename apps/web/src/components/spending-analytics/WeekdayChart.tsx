import { Bar, BarChart, Cell, XAxis } from "recharts"

import type { SpendAnalytics } from "@/api/spend-items/spend-items.types"
import { WEEKDAYS } from "@/components/spending-analytics/analytics-format"
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

const WEEKDAY_NAMES = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
]

type WeekdayChartProps = {
  data: SpendAnalytics
  className?: string
}

export function WeekdayChart({ data, className }: WeekdayChartProps) {
  const bars = data.weekdays.map((day) => ({
    day: WEEKDAYS[day.weekday],
    name: WEEKDAY_NAMES[day.weekday],
    total: Number(day.total),
  }))
  const peak = bars.reduce(
    (best, bar) => (bar.total > best.total ? bar : best),
    bars[0]
  )
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>By weekday</CardTitle>
        <CardDescription>
          {peak?.total
            ? `You spend most on ${peak.name}`
            : "No spend in this range"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-end">
        <ChartContainer className="aspect-auto h-48 w-full" config={config}>
          <BarChart data={bars} margin={{ top: 8 }}>
            <XAxis
              axisLine={false}
              dataKey="day"
              tickLine={false}
              tickMargin={8}
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
                />
              }
              cursor={false}
            />
            <Bar dataKey="total" radius={[6, 6, 2, 2]}>
              {bars.map((bar) => (
                <Cell
                  fill="var(--color-total)"
                  fillOpacity={bar === peak && bar.total ? 1 : 0.25}
                  key={bar.day}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
