import { AlertCircleIcon, ReceiptTextIcon } from "lucide-react"

import { SpendingAccordion } from "@/components/spending/SpendingAccordion"
import { SpendingLedgerSkeleton } from "@/components/spending/SpendingLedgerSkeleton"
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
import { useSpendItems } from "@/hooks/spend-items/use-spend-items"

function openAddSpending() {
  // ponytail: header owns the dialog; empty CTA reuses the trigger
  document
    .querySelector<HTMLButtonElement>("[data-slot=add-spending-trigger]")
    ?.click()
}

export function SpendingPage() {
  const spendItems = useSpendItems()
  const documents = useDocuments()
  const emptyManual =
    documents.data?.filter(
      (document) =>
        document.source === "manual" &&
        !spendItems.data?.some((item) => item.document_id === document.id)
    ) ?? []
  const hasLedger = Boolean(spendItems.data?.length) || emptyManual.length > 0
  const entryCount = (spendItems.data?.length ?? 0) + emptyManual.length

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-6 2xl:mx-auto 2xl:max-w-7xl">
      <section
        aria-labelledby="transactions-heading"
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="flex shrink-0 items-center justify-between gap-4">
          <h2
            className="text-xl font-semibold tracking-tight"
            id="transactions-heading"
          >
            Transactions
          </h2>
          {hasLedger ? (
            <p className="shrink-0 text-xs text-muted-foreground">
              {entryCount} {entryCount === 1 ? "entry" : "entries"}
            </p>
          ) : null}
        </div>

        {spendItems.isPending || documents.isPending ? (
          <SpendingLedgerSkeleton />
        ) : spendItems.isError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Spending couldn’t be loaded</AlertTitle>
            <AlertDescription>
              Refresh the page or try again in a moment.
            </AlertDescription>
          </Alert>
        ) : hasLedger ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SpendingAccordion
              emptyManual={emptyManual}
              items={spendItems.data ?? []}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptTextIcon />
                </EmptyMedia>
                <EmptyTitle>No spending yet</EmptyTitle>
                <EmptyDescription>
                  Add a receipt or start a bill from the top bar. Entries appear
                  here after you save them.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openAddSpending}>Add spending</Button>
              </EmptyContent>
            </Empty>
          </div>
        )}
      </section>
    </main>
  )
}
