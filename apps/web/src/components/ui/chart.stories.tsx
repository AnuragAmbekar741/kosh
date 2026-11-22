import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { analytics } from "@/stories/fixtures"

const dayLabel = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
})

function tick(value: string) {
  return dayLabel.format(new Date(`${value}T00:00:00`))
}

const points = analytics.trend.map((point, index) => ({
  start: point.start,
  total: Number(point.total),
  // A made-up "same day last month" series, for the two-series examples.
  previous: Math.round(Number(point.total) * 0.7 + ((index * 137) % 600)),
}))

const singleConfig = {
  total: { label: "Spent", color: "var(--chart-1)" },
} satisfies ChartConfig

const compareConfig = {
  total: { label: "November", color: "var(--chart-1)" },
  previous: { label: "October", color: "var(--chart-3)" },
} satisfies ChartConfig

const meta = {
  title: "Core/Charts/Chart",
  component: ChartContainer,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartContainer>

export default meta

type Story = StoryObj<typeof meta>

/** Spending over time, as on the analytics page. */
export const Trend: Story = {
  args: { config: singleConfig, children: <></> },
  render: () => (
    <ChartContainer className="aspect-auto h-64 w-full" config={singleConfig}>
      <AreaChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="story-trend-fill" x1="0" x2="0" y1="0" y2="1">
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
          tickFormatter={tick}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis axisLine={false} tickLine={false} width={52} />
        <ChartTooltip
          content={<ChartTooltipContent hideIndicator />}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Area
          activeDot={{ r: 4, strokeWidth: 0 }}
          dataKey="total"
          fill="url(#story-trend-fill)"
          stroke="var(--color-total)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  ),
}

/** Two series with a legend: this month against last. */
export const Bars: Story = {
  args: { config: compareConfig, children: <></> },
  render: () => (
    <ChartContainer className="aspect-auto h-64 w-full" config={compareConfig}>
      <BarChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="start"
          minTickGap={24}
          tickFormatter={tick}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis axisLine={false} tickLine={false} width={52} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
        <Bar dataKey="previous" fill="var(--color-previous)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
}

/** The five chart tokens side by side. */
export const Palette: Story = {
  args: { config: {}, children: <></> },
  render: () => {
    const config = Object.fromEntries(
      [1, 2, 3, 4, 5].map((n) => [
        `c${n}`,
        { label: `chart-${n}`, color: `var(--chart-${n})` },
      ])
    ) satisfies ChartConfig
    const data = points.slice(0, 6).map((point, index) => ({
      start: point.start,
      c1: 400 + index * 90,
      c2: 300 + index * 70,
      c3: 250 + index * 60,
      c4: 200 + index * 40,
      c5: 150 + index * 30,
    }))
    return (
      <ChartContainer className="aspect-auto h-64 w-full" config={config}>
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <XAxis
            axisLine={false}
            dataKey="start"
            tickFormatter={tick}
            tickLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
          <ChartLegend content={<ChartLegendContent />} />
          {[1, 2, 3, 4, 5].map((n) => (
            <Bar
              key={n}
              dataKey={`c${n}`}
              fill={`var(--color-c${n})`}
              radius={4}
              stackId="all"
            />
          ))}
        </BarChart>
      </ChartContainer>
    )
  },
}
