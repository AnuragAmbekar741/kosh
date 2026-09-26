import { AlertCircleIcon, ReceiptTextIcon } from "lucide-react"

import { SpendingAccordion } from "@/components/spending/SpendingAccordion"
import { SpendingItemsPager } from "@/components/spending/SpendingItemsPager"
import { SpendingItemsTable } from "@/components/spending/SpendingItemsTable"
import { SpendingLedgerSkeleton } from "@/components/spending/SpendingLedgerSkeleton"
import { SpendingToolbar } from "@/components/spending/SpendingToolbar"
import { dateInRange } from "@/components/spending/spend-period"
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
import { useDocuments } from "@/hooks/documents/use-documents"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import {
  useSpendItems,
  useSpendSummary,
} from "@/hooks/spend-items/use-spend-items"

function openAddSpending() {
  // ponytail: header owns the dialog; empty CTA reuses the trigger
  document
    .querySelector<HTMLButtonElement>("[data-slot=add-spending-trigger]")
    ?.click()
}

export function SpendingPage() {
  const filters = useSpendFilters()
  const spendItems = useSpendItems(filters.query, filters.pageParams)
  const summary = useSpendSummary(filters.summaryQuery)
  const documents = useDocuments()
  const items = spendItems.data?.data ?? []
  const hasContentFilters = Boolean(
    filters.query.category?.length || filters.query.source || filters.query.q
  )
  const emptyManual =
    filters.view === "bills"
      ? (documents.data ?? []).filter(
          (document) =>
            document.source === "manual" &&
            !items.some((item) => item.document_id === document.id) &&
            !hasContentFilters &&
            dateInRange(
              document.created_at,
              filters.query.spent_from,
              filters.query.spent_to
            )
        )
      : []
  const firstUse = summary.data?.has_spend === false
  const loading = spendItems.isPending || summary.isPending
  const hasLedger = items.length > 0 || emptyManual.length > 0
  const filterEmpty = Boolean(
    summary.data?.has_spend &&
    summary.data.total === "0.00" &&
    !hasLedger &&
    !spendItems.isPending
  )
  const count =
    filters.view === "items"
      ? (spendItems.data?.total ?? items.length)
      : (summary.data?.bill_count ?? 0) + emptyManual.length

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-6 2xl:mx-auto 2xl:max-w-7xl">
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <SpendingToolbar disabled={firstUse} />

        <section
          aria-labelledby="transactions-heading"
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <h2
                className="text-xl font-semibold tracking-tight"
                id="transactions-heading"
              >
                Transactions
              </h2>
              {hasLedger || filterEmpty ? (
                <p className="shrink-0 text-xs text-muted-foreground">
                  {count} {count === 1 ? "entry" : "entries"}
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <SpendingLedgerSkeleton />
          ) : spendItems.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Spending couldn’t be loaded</AlertTitle>
              <AlertDescription>
                Refresh the page or try again in a moment.
              </AlertDescription>
            </Alert>
          ) : firstUse ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No spending yet</EmptyTitle>
                  <EmptyDescription>
                    Add a receipt or start a bill from the top bar. Entries
                    appear here after you save them.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={openAddSpending}>Add spending</Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : filterEmpty ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>Nothing matches</EmptyTitle>
                  <EmptyDescription>
                    {filters.canReset
                      ? "No bills in this period match the current filters."
                      : "No bills in this period."}
                  </EmptyDescription>
                </EmptyHeader>
                {filters.canReset ? (
                  <EmptyContent>
                    <Button onClick={filters.resetFilters} variant="outline">
                      Reset
                    </Button>
                  </EmptyContent>
                ) : null}
              </Empty>
            </div>
          ) : hasLedger ? (
            filters.view === "items" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <SpendingItemsTable items={items} />
                <SpendingItemsPager
                  onPageChange={filters.setPage}
                  page={filters.page}
                  total={spendItems.data?.total ?? 0}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SpendingAccordion emptyManual={emptyManual} items={items} />
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  )
}
