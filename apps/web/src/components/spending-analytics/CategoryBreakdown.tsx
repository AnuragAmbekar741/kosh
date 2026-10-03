import { Cell, Label, Pie, PieChart } from "recharts"

import type {
  Category,
  SpendAnalytics,
} from "@/api/spend-items/spend-items.types"
import { formatCompactMoney } from "@/components/spending-analytics/analytics-format"
import { categoryColor } from "@/components/spending/categories"
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
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

type CategoryRow = SpendAnalytics["categories"][number]

type CategoryRowButtonProps = {
  row: CategoryRow
  currency: string
  selected: boolean
  onToggle: (category: Category) => void
}

function CategoryRowButton({
  row,
  currency,
  selected,
  onToggle,
}: CategoryRowButtonProps) {
  return (
    <li>
      <button
        aria-pressed={selected}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[auto_1fr_auto_3rem] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
          selected && "bg-muted"
        )}
        onClick={() => onToggle(row.category)}
        type="button"
      >
        <span
          className="size-2.5 rounded-full"
          style={{ background: categoryColor(row.category) }}
        />
        <span className="truncate">{row.category}</span>
        <span className="tabular-nums">{formatMoney(row.total, currency)}</span>
        <span className="text-right text-xs text-muted-foreground tabular-nums">
          {Math.round(row.share * 100)}%
        </span>
      </button>
    </li>
  )
}

type CategoryBreakdownProps = {
  className?: string
  data: SpendAnalytics
  selected: Category[]
  onToggle: (category: Category) => void
}

export function CategoryBreakdown({
  className,
  data,
  selected,
  onToggle,
}: CategoryBreakdownProps) {
  const slices = data.categories.map((row) => ({
    category: row.category,
    total: Number(row.total),
    fill: categoryColor(row.category),
  }))
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>By category</CardTitle>
        <CardDescription>Click a category to filter</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-col gap-3">
        <ChartContainer className="mx-auto aspect-square h-44" config={{}}>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatMoney(Number(value), data.currency)}
                      </span>
                    </span>
                  )}
                  hideLabel
                  nameKey="category"
                />
              }
            />
            <Pie
              cornerRadius={4}
              data={slices}
              dataKey="total"
              innerRadius="68%"
              nameKey="category"
              onClick={(_, index) => {
                const slice = slices[index]
                if (slice) onToggle(slice.category)
              }}
              paddingAngle={slices.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {slices.map((slice) => (
                <Cell
                  className="cursor-pointer"
                  fill={slice.fill}
                  key={slice.category}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null
                  return (
                    <text
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x={viewBox.cx}
                      y={viewBox.cy}
                    >
                      <tspan
                        className="fill-foreground text-xl font-semibold"
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 6}
                      >
                        {formatCompactMoney(Number(data.total), data.currency)}
                      </tspan>
                      <tspan
                        className="fill-muted-foreground text-xs"
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 14}
                      >
                        {data.categories.length} categor
                        {data.categories.length === 1 ? "y" : "ies"}
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="-mx-2 flex max-h-56 flex-col overflow-y-auto">
          {data.categories.map((row) => (
            <CategoryRowButton
              currency={data.currency}
              key={row.category}
              onToggle={onToggle}
              row={row}
              selected={selected.includes(row.category)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
