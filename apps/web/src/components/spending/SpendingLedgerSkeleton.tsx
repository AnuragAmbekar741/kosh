import { Skeleton } from "@/components/ui/skeleton"

const skeletonRows = [
  "bill-a",
  "bill-b",
  "bill-c",
  "bill-d",
  "bill-e",
] as const

function SpendingLedgerSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 not-last:border-b sm:px-5 sm:py-5">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="size-9 rounded-lg" />
    </div>
  )
}

export function SpendingLedgerSkeleton() {
  return (
    <div
      aria-label="Loading spending"
      className="min-h-0 flex-1 overflow-hidden rounded-xl border"
      role="status"
    >
      {skeletonRows.map((id) => (
        <SpendingLedgerSkeletonRow key={id} />
      ))}
    </div>
  )
}
