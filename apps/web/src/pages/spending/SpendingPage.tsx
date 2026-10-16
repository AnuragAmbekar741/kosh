import { useEffect } from "react"
import { AlertCircleIcon, PlusIcon, UploadIcon } from "lucide-react"

import { SpendingAccordion } from "@/components/spending/SpendingAccordion"
import { SpendingItemsPager } from "@/components/spending/SpendingItemsPager"
import { SpendingItemsTable } from "@/components/spending/SpendingItemsTable"
import { SpendingLedgerSkeleton } from "@/components/spending/SpendingLedgerSkeleton"
import { SpendingToolbar } from "@/components/spending/SpendingToolbar"
import { openAddSpending } from "@/components/spending/add-spending"
import { dateInRange } from "@/components/spending/spend-period"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyEyebrow,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useDocuments } from "@/hooks/documents/use-documents"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import {
  useSpendItems,
  useSpendSummary,
} from "@/hooks/spend-items/use-spend-items"

export function SpendingPage() {
  const filters = useSpendFilters()
  const spendItems = useSpendItems(filters.query, filters.pageParams)
  const summary = useSpendSummary(filters.summaryQuery)
  const documents = useDocuments()
  const items = spendItems.data?.data ?? []
  const total = spendItems.data?.total ?? 0
  const { page, pageSize, setPage, view } = filters
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  // A wider window (or a deleted row) can leave the URL on a page that no
  // longer exists; step back to the last real one.
  useEffect(() => {
    if (view === "items" && spendItems.data && page > lastPage) {
      setPage(lastPage)
    }
  }, [view, spendItems.data, page, lastPage, setPage])

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
              document.spent_at ?? document.created_at,
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
  const noun = filters.view === "items" ? "item" : "bill"
  const countLabel =
    hasLedger || filterEmpty
      ? `${count} ${noun}${count === 1 ? "" : "s"}`
      : null

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-3 md:pt-6 2xl:mx-auto 2xl:max-w-7xl">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-6">
        <SpendingToolbar countLabel={countLabel} disabled={firstUse} />

        <section
          aria-label={filters.view === "items" ? "Items" : "Bills"}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
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
                  <EmptyEyebrow>Start your ledger</EmptyEyebrow>
                  <EmptyTitle>Your first bill goes here</EmptyTitle>
                  <EmptyDescription>
                    Add a receipt or start a bill from the top bar. Entries
                    appear here after you save them.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => openAddSpending()}>
                    <PlusIcon data-icon="inline-start" />
                    Add spending
                  </Button>
                  <Button
                    onClick={() => openAddSpending("upload")}
                    variant="outline"
                  >
                    <UploadIcon data-icon="inline-start" />
                    Upload receipt
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : filterEmpty ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyEyebrow>Filters</EmptyEyebrow>
                  <EmptyTitle>Nothing matches</EmptyTitle>
                  <EmptyDescription>
                    {filters.canReset
                      ? "No bills match the current filters. Try a wider date range or clear a category."
                      : "No bills yet."}
                  </EmptyDescription>
                </EmptyHeader>
                {filters.canReset ? (
                  <EmptyContent>
                    <Button onClick={filters.resetFilters} variant="outline">
                      Reset filters
                    </Button>
                  </EmptyContent>
                ) : null}
              </Empty>
            </div>
          ) : hasLedger ? (
            filters.view === "items" ? (
              // Phones: the pager stays clear of the floating nav button.
              <div className="flex min-h-0 flex-1 flex-col gap-3 max-md:pb-(--phone-nav-clearance)">
                <SpendingItemsTable
                  items={items}
                  page={filters.page}
                  pageSize={filters.pageSize}
                />
                <SpendingItemsPager
                  onPageChange={filters.setPage}
                  page={filters.page}
                  pageSize={filters.pageSize}
                  total={total}
                />
              </div>
            ) : (
              <div className="no-scrollbar min-h-0 flex-1 scroll-fade-y overflow-y-auto max-md:pb-(--phone-nav-clearance)">
                <SpendingAccordion emptyManual={emptyManual} items={items} />
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  )
}
