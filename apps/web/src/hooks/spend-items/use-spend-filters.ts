import { useCallback } from "react"
import { useLocation, useSearchParams } from "react-router"

import type {
  Category,
  PageParams,
  SpendPeriod,
  SpendQuery,
  SpendSource,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"
import { isCategory } from "@/components/spending/categories"
import {
  dateFilterLabel,
  dateInRange,
  isDatePreset,
  parseIsoDate,
  presetRange,
  type DateFilter,
  type DateRange,
} from "@/components/spending/spend-period"
import { usePageSize } from "@/hooks/spend-items/use-page-size"

const SOURCES = ["manual", "document"] as const
const BILLS_LIMIT = 200

type FilterPatch = {
  date?: DateFilter
  from?: string
  to?: string
  category?: Category[] | null
  source?: SpendSource | null
  q?: string | null
  page?: number
}

function parseSource(value: string | null): SpendSource | undefined {
  return SOURCES.find((source) => source === value)
}

function parseView(pathname: string): "bills" | "items" {
  return pathname === "/spending/items" ? "items" : "bills"
}

function parseDate(searchParams: URLSearchParams): {
  date: DateFilter
  range: DateRange | null
} {
  const value = searchParams.get("date")
  if (isDatePreset(value)) return { date: value, range: presetRange(value) }
  const from = parseIsoDate(searchParams.get("from"))
  const to = parseIsoDate(searchParams.get("to"))
  if (value === "custom" && from && to && from <= to) {
    return { date: "custom", range: { from, to } }
  }
  return { date: "all", range: null }
}

function summaryPeriod(date: DateFilter): SpendPeriod | undefined {
  if (date === "all") return undefined
  return date === "this-month" || date === "last-month" ? "month" : "custom"
}

export function useSpendFilters() {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { date, range } = parseDate(searchParams)
  const categories = searchParams.getAll("category").filter(isCategory)
  const source = parseSource(searchParams.get("source"))
  const q = searchParams.get("q")?.trim() || undefined
  const view = parseView(pathname)
  const pageSize = usePageSize()
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1
  const pageParams: PageParams =
    view === "bills"
      ? // ponytail: bills groups client-side; a row page would split a bill total
        { skip: 0, limit: BILLS_LIMIT }
      : { skip: (page - 1) * pageSize, limit: pageSize }

  const query: SpendQuery = {
    ...(range ? { spent_from: range.from, spent_to: range.to } : {}),
    ...(categories.length ? { category: categories } : {}),
    ...(source ? { source } : {}),
    ...(q ? { q } : {}),
  }
  const period = summaryPeriod(date)
  const summaryQuery: SpendSummaryQuery = period ? { ...query, period } : query
  // Search has its own clear button, so it isn't counted on the Filters button.
  const filterCount =
    (date === "all" ? 0 : 1) + (categories.length ? 1 : 0) + (source ? 1 : 0)
  const canReset = Boolean(filterCount || q || page > 1)

  const write = useCallback(
    (patch: FilterPatch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if ("date" in patch) {
          next.delete("from")
          next.delete("to")
          if (!patch.date || patch.date === "all") next.delete("date")
          else next.set("date", patch.date)
          if (patch.date === "custom" && patch.from && patch.to) {
            next.set("from", patch.from)
            next.set("to", patch.to)
          }
        }
        if ("category" in patch) {
          next.delete("category")
          for (const category of patch.category ?? []) {
            next.append("category", category)
          }
        }
        if ("source" in patch) {
          if (patch.source) next.set("source", patch.source)
          else next.delete("source")
        }
        if ("q" in patch) {
          if (patch.q) next.set("q", patch.q)
          else next.delete("q")
        }
        // Drop params from the old Day / Week / Month toolbar.
        next.delete("period")
        next.delete("view")
        if ("page" in patch && Object.keys(patch).length === 1) {
          if (patch.page && patch.page > 1) next.set("page", String(patch.page))
          else next.delete("page")
        } else {
          next.delete("page")
        }
        return next
      })
    },
    [setSearchParams]
  )

  const setDate = useCallback(
    (next: Exclude<DateFilter, "custom">) => write({ date: next }),
    [write]
  )

  const applyCustomRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      write({
        date: "custom",
        from: nextFrom <= nextTo ? nextFrom : nextTo,
        to: nextFrom <= nextTo ? nextTo : nextFrom,
      })
    },
    [write]
  )

  function toggleCategory(name: Category) {
    const next = categories.includes(name)
      ? categories.filter((category) => category !== name)
      : [...categories, name]
    write({ category: next.length ? next : null })
  }

  const setSource = useCallback(
    (next: SpendSource | null) => write({ source: next }),
    [write]
  )
  const setQ = useCallback((next: string | null) => write({ q: next }), [write])
  const setPage = useCallback((next: number) => write({ page: next }), [write])
  const clearFilters = useCallback(
    () => write({ date: "all", category: null, source: null }),
    [write]
  )
  const resetFilters = useCallback(
    () =>
      write({ date: "all", category: null, source: null, q: null, page: 1 }),
    [write]
  )

  function isInView(isoDate: string) {
    return dateInRange(isoDate, range?.from, range?.to)
  }

  // A just-saved bill outside the date filter: drop the date filter to show it.
  const revealDate = useCallback(() => write({ date: "all" }), [write])

  return {
    date,
    range,
    dateLabel: dateFilterLabel(date, range),
    categories,
    source,
    q,
    view,
    page,
    pageSize,
    pageParams,
    query,
    summaryQuery,
    filterCount,
    canReset,
    setDate,
    applyCustomRange,
    toggleCategory,
    setSource,
    setQ,
    setPage,
    clearFilters,
    resetFilters,
    isInView,
    revealDate,
  }
}
