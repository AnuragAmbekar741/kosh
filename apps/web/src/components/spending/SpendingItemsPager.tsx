import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { PAGE_SIZE } from "@/hooks/spend-items/use-spend-filters"

type SpendingItemsPagerProps = {
  page: number
  total: number
  onPageChange: (page: number) => void
}

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  return [...pages].filter((value) => value >= 1 && value <= pageCount).sort(
    (left, right) => left - right
  )
}

export function SpendingItemsPager({
  page,
  total,
  onPageChange,
}: SpendingItemsPagerProps) {
  if (total <= PAGE_SIZE) return null
  const pageCount = Math.ceil(total / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  const pages = pageWindow(page, pageCount)

  function go(next: number) {
    if (next < 1 || next > pageCount || next === page) return
    onPageChange(next)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Previous"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              onClick={(event) => {
                event.preventDefault()
                go(page - 1)
              }}
            />
          </PaginationItem>
          {pages.map((value, index) => {
            const previous = pages[index - 1]
            const gap = previous != null && value - previous > 1
            return (
              <PaginationItem key={value}>
                {gap ? <PaginationEllipsis /> : null}
                <PaginationLink
                  href="#"
                  isActive={value === page}
                  onClick={(event) => {
                    event.preventDefault()
                    go(value)
                  }}
                >
                  {value}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="Next"
              aria-disabled={page >= pageCount}
              className={
                page >= pageCount ? "pointer-events-none opacity-50" : undefined
              }
              onClick={(event) => {
                event.preventDefault()
                go(page + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
