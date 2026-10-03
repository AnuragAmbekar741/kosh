import { AlertCircleIcon, ChartNoAxesCombinedIcon } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router"

import { AnalyticsStats } from "@/components/spending-analytics/AnalyticsStats"
import { CategoryBreakdown } from "@/components/spending-analytics/CategoryBreakdown"
import {
  LargestBills,
  TopMerchants,
} from "@/components/spending-analytics/TopLists"
import { TrendChart } from "@/components/spending-analytics/TrendChart"
import { WeekdayChart } from "@/components/spending-analytics/WeekdayChart"
import { SpendingToolbar } from "@/components/spending/SpendingToolbar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { useSpendAnalytics } from "@/hooks/spend-items/use-spend-items"

function AnalyticsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["total", "bills", "average", "category"].map((key) => (
          <Skeleton className="h-24 rounded-xl" key={key} />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <Skeleton className="h-96 rounded-xl lg:col-span-3" />
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}

function openAddSpending() {
  // ponytail: header owns the dialog; empty CTA reuses the trigger
  document
    .querySelector<HTMLButtonElement>("[data-slot=add-spending-trigger]")
    ?.click()
}

export function AnalyticsPage() {
  const filters = useSpendFilters()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currency = searchParams.get("currency") ?? undefined
  const analytics = useSpendAnalytics({ ...filters.query, currency })
  const data = analytics.data
  const firstUse = data?.has_spend === false
  const filterEmpty = Boolean(data?.has_spend && data.item_count === 0)
  const countLabel =
    data && !firstUse
      ? `${data.bill_count} bill${data.bill_count === 1 ? "" : "s"}`
      : null

  function setCurrency(next: string | undefined) {
    if (!next) return
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set("currency", next)
      return params
    })
  }

  function openMerchant(merchant: string) {
    const next = new URLSearchParams(searchParams)
    next.set("q", merchant)
    next.delete("page")
    void navigate({ pathname: "/spending/bills", search: `?${next}` })
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-6 2xl:mx-auto 2xl:max-w-7xl">
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <SpendingToolbar countLabel={countLabel} disabled={firstUse} />

        <section
          aria-label="Analytics"
          className="min-h-0 flex-1 overflow-y-auto p-px pb-6"
        >
          {analytics.isPending ? (
            <AnalyticsSkeleton />
          ) : analytics.isError || !data ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Analytics couldn’t be loaded</AlertTitle>
              <AlertDescription>
                Refresh the page or try again in a moment.
              </AlertDescription>
            </Alert>
          ) : firstUse || filterEmpty ? (
            <div className="flex h-full items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ChartNoAxesCombinedIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {firstUse ? "No analytics yet" : "Nothing matches"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {firstUse
                      ? "Charts appear once you add a receipt or a bill."
                      : "No spending matches the current filters."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {firstUse ? (
                    <Button onClick={openAddSpending}>Add spending</Button>
                  ) : (
                    <Button onClick={filters.resetFilters} variant="outline">
                      Reset
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.currencies.length > 1 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Amounts in</span>
                  <ToggleGroup
                    aria-label="Currency"
                    onValueChange={(value: string[]) => setCurrency(value[0])}
                    size="sm"
                    value={[data.currency]}
                  >
                    {data.currencies.map((code) => (
                      <ToggleGroupItem key={code} value={code}>
                        {code}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <span className="hidden sm:inline">
                    Each currency is totalled on its own.
                  </span>
                </div>
              ) : null}
              <AnalyticsStats data={data} periodLabel={filters.dateLabel} />
              <div className="grid gap-3 lg:grid-cols-5">
                <TrendChart
                  className="lg:col-span-3"
                  data={data}
                  periodLabel={filters.dateLabel}
                />
                <CategoryBreakdown
                  className="lg:col-span-2"
                  data={data}
                  onToggle={filters.toggleCategory}
                  selected={filters.categories}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <TopMerchants data={data} onOpenMerchant={openMerchant} />
                <LargestBills data={data} onOpenMerchant={openMerchant} />
                <WeekdayChart
                  className="md:col-span-2 xl:col-span-1"
                  data={data}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
