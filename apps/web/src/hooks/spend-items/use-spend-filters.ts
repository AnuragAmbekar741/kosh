import { useCallback } from "react"
import { useSearchParams } from "react-router"

import type {
  PageParams,
  SpendPeriod,
  SpendQuery,
  SpendSource,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"
import { CATEGORIES } from "@/components/spending/CategoryBadge"
import {
  anchorDate,
  currentMonthRange,
  dateInRange,
  fromIsoDate,
  parseIsoDate,
  periodLabel,
  rangeForPeriod,
  shiftRange,
  spentInLabel,
} from "@/components/spending/spend-period"

const PERIODS = ["day", "week", "month", "custom"] as const
const SOURCES = ["manual", "document"] as const
const KNOWN_CATEGORIES = new Set<string>(CATEGORIES)
export const PAGE_SIZE = 50
const BILLS_LIMIT = 200

type FilterPatch = {
  period?: SpendPeriod
  from?: string
  to?: string
  category?: string[] | null
  source?: SpendSource | null
  q?: string | null
  view?: "bills" | "items"
  page?: number
}

function parsePeriod(value: string | null): SpendPeriod {
  return PERIODS.find((period) => period === value) ?? "month"
}

function parseSource(value: string | null): SpendSource | undefined {
  return SOURCES.find((source) => source === value)
}

function parseView(value: string | null): "bills" | "items" {
  return value === "items" ? "items" : "bills"
}

function parseCategories(values: string[]) {
  return values.filter((value) => KNOWN_CATEGORIES.has(value))
}

export function useSpendFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaults = currentMonthRange()
  const period = parsePeriod(searchParams.get("period"))
  const parsedFrom = parseIsoDate(searchParams.get("from"))
  const parsedTo = parseIsoDate(searchParams.get("to"))
  const from = parsedFrom ?? defaults.from
  const to = parsedTo ?? defaults.to
  const range = from <= to ? { from, to } : defaults
  const categories = parseCategories(searchParams.getAll("category"))
  const source = parseSource(searchParams.get("source"))
  const q = searchParams.get("q")?.trim() || undefined
  const view = parseView(searchParams.get("view"))
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1
  const pageParams: PageParams =
    view === "bills"
      ? // ponytail: bills groups client-side; a row page would split a bill total
        { skip: 0, limit: BILLS_LIMIT }
      : { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }

  const query: SpendQuery = {
    spent_from: range.from,
    spent_to: range.to,
    ...(categories.length ? { category: categories } : {}),
    ...(source ? { source } : {}),
    ...(q ? { q } : {}),
  }
  const summaryQuery: SpendSummaryQuery = { ...query, period }
  const hasActiveFilters = Boolean(categories.length || source || q)

  const write = useCallback(
    (patch: FilterPatch) => {
      setSearchParams((prev) => {
        const fallback = currentMonthRange()
        const next = new URLSearchParams(prev)
        const nextPeriod = patch.period ?? parsePeriod(next.get("period"))
        const nextFrom =
          patch.from ?? parseIsoDate(next.get("from")) ?? fallback.from
        const nextTo = patch.to ?? parseIsoDate(next.get("to")) ?? fallback.to
        next.set("period", nextPeriod)
        next.set("from", nextFrom)
        next.set("to", nextTo)
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
        if (patch.view === "items") next.set("view", "items")
        if (patch.view === "bills") next.delete("view")
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

  const setPeriod = useCallback(
    (next: Exclude<SpendPeriod, "custom">) => {
      const window = rangeForPeriod(next, anchorDate(range.from, range.to))
      write({ period: next, from: window.from, to: window.to })
    },
    [range.from, range.to, write]
  )

  const shift = useCallback(
    (direction: -1 | 1) => {
      const window = shiftRange(period, range.from, range.to, direction)
      write({ from: window.from, to: window.to })
    },
    [period, range.from, range.to, write]
  )

  const applyCustomRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      write({
        period: "custom",
        from: nextFrom <= nextTo ? nextFrom : nextTo,
        to: nextFrom <= nextTo ? nextTo : nextFrom,
      })
    },
    [write]
  )

  const toggleCategory = useCallback(
    (name: string) => {
      const next = categories.includes(name)
        ? categories.filter((category) => category !== name)
        : [...categories, name]
      write({ category: next.length ? next : null })
    },
    [categories, write]
  )

  const setSource = useCallback(
    (next: SpendSource | null) => write({ source: next }),
    [write]
  )
  const setQ = useCallback((next: string | null) => write({ q: next }), [write])
  const setView = useCallback(
    (next: "bills" | "items") => write({ view: next }),
    [write]
  )
  const setPage = useCallback((next: number) => write({ page: next }), [write])
  const clearFilters = useCallback(
    () => write({ category: null, source: null, q: null }),
    [write]
  )

  const revealDate = useCallback(
    (isoDate: string) => {
      const day = parseIsoDate(
        isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate
      )
      if (!day || dateInRange(day, range.from, range.to)) return
      // Jump to the spend's month so a just-confirmed receipt is visible.
      const window = currentMonthRange(fromIsoDate(day))
      write({ period: "month", from: window.from, to: window.to })
    },
    [range.from, range.to, write]
  )

  return {
    period,
    from: range.from,
    to: range.to,
    categories,
    source,
    q,
    view,
    page,
    pageParams,
    query,
    summaryQuery,
    label: periodLabel(period, range.from, range.to),
    spentInLabel: spentInLabel(period, range.from, range.to),
    hasActiveFilters,
    setPeriod,
    shift,
    applyCustomRange,
    toggleCategory,
    setSource,
    setQ,
    setView,
    setPage,
    clearFilters,
    revealDate,
  }
}
