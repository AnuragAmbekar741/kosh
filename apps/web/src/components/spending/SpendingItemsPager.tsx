import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type SpendingItemsPagerProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

// Phones get icon-only arrows around "Page X of N" instead of numbered links.
const compactArrow = { size: "icon", text: "", className: "pl-0!" } as const

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  return [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((left, right) => left - right)
}

export function SpendingItemsPager({
  page,
  pageSize,
  total,
  onPageChange,
}: SpendingItemsPagerProps) {
  const isMobile = useIsMobile()
  if (total <= pageSize) return null
  const pageCount = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const pages = pageWindow(page, pageCount)

  function go(next: number) {
    if (next < 1 || next > pageCount || next === page) return
    onPageChange(next)
  }

  return (
    // Keep clear of the assistant launcher fixed at the bottom right: room
    // below the pager on phones, beside it on wider screens.
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-3",
        isMobile ? "pb-12" : "pr-12"
      )}
    >
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
              {...(isMobile ? compactArrow : {})}
              className={cn(
                isMobile && compactArrow.className,
                page <= 1 && "pointer-events-none opacity-50"
              )}
              onClick={(event) => {
                event.preventDefault()
                go(page - 1)
              }}
            />
          </PaginationItem>
          {isMobile ? (
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground tabular-nums">
                Page {page} of {pageCount}
              </span>
            </PaginationItem>
          ) : null}
          {(isMobile ? [] : pages).map((value, index) => {
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
              {...(isMobile ? compactArrow : {})}
              className={cn(
                isMobile && compactArrow.className,
                page >= pageCount && "pointer-events-none opacity-50"
              )}
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
