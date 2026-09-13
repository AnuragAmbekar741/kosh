import { AlertCircleIcon, ReceiptTextIcon } from "lucide-react"

import { SpendingAccordion } from "@/components/spending/SpendingAccordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useSpendItems } from "@/hooks/spend-items/use-spend-items"

export function SpendingPage() {
  const spendItems = useSpendItems()

  return (
    <main className="flex h-[calc(100svh-5rem)] min-h-0 w-full flex-col pt-6 2xl:mx-auto 2xl:max-w-7xl">
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
          {spendItems.data?.length ? (
            <p className="shrink-0 text-xs text-muted-foreground">
              {spendItems.data.length}{" "}
              {spendItems.data.length === 1 ? "entry" : "entries"}
            </p>
          ) : null}
        </div>

        {spendItems.isPending ? (
          <div
            aria-label="Loading spending"
            className="flex min-h-0 flex-1 flex-col gap-2"
            role="status"
          >
            <Skeleton className="h-20 rounded-none" />
            <Skeleton className="h-20 rounded-none" />
            <Skeleton className="h-20 rounded-none" />
          </div>
        ) : spendItems.isError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Spending couldn’t be loaded</AlertTitle>
            <AlertDescription>
              Refresh the page or try again in a moment.
            </AlertDescription>
          </Alert>
        ) : spendItems.data?.length ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SpendingAccordion items={spendItems.data} />
          </div>
        ) : (
          <Empty className="min-h-0 flex-1 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptTextIcon />
              </EmptyMedia>
              <EmptyTitle>No spending yet</EmptyTitle>
              <EmptyDescription>
                Add a receipt or statement from the top bar. Extracted entries
                will appear here after you review them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </main>
  )
}
