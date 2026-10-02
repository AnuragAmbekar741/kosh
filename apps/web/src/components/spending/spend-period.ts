export type DateRange = {
  from: string
  to: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function fromIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

/** Whole days from today to an ISO date: negative in the past, positive ahead. */
export function daysFromToday(iso: string, now = new Date()) {
  const today = fromIsoDate(toIsoDate(now))
  return Math.round((fromIsoDate(iso).getTime() - today.getTime()) / 86_400_000)
}

export function parseIsoDate(value: string | null) {
  if (!value || !ISO_DATE.test(value)) return null
  const date = fromIsoDate(value)
  if (Number.isNaN(date.getTime()) || toIsoDate(date) !== value) return null
  return value
}

export function currentMonthRange(now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export const DATE_PRESETS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "this-year", label: "This year" },
] as const

export type DatePreset = (typeof DATE_PRESETS)[number]["value"]

/** `all` is the default: no date bounds at all. */
export type DateFilter = "all" | DatePreset | "custom"

export function isDatePreset(value: string | null): value is DatePreset {
  return DATE_PRESETS.some((preset) => preset.value === value)
}

export function presetRange(preset: DatePreset, now = new Date()): DateRange {
  const year = now.getFullYear()
  const month = now.getMonth()
  if (preset === "last-month") {
    return currentMonthRange(new Date(year, month - 1, 1))
  }
  if (preset === "last-3-months") {
    return {
      from: toIsoDate(new Date(year, month - 2, 1)),
      to: currentMonthRange(now).to,
    }
  }
  if (preset === "this-year") {
    return {
      from: toIsoDate(new Date(year, 0, 1)),
      to: toIsoDate(new Date(year, 11, 31)),
    }
  }
  return currentMonthRange(now)
}

export function rangeLabel({ from, to }: DateRange) {
  const format = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: from.slice(0, 4) === to.slice(0, 4) ? undefined : "numeric",
  })
  return `${format.format(fromIsoDate(from))} – ${format.format(fromIsoDate(to))}`
}

export function dateFilterLabel(filter: DateFilter, range: DateRange | null) {
  if (filter === "all") return "All time"
  if (filter === "custom") return range ? rangeLabel(range) : "Custom range"
  return DATE_PRESETS.find((preset) => preset.value === filter)?.label ?? ""
}

export function dateInRange(value: string, from?: string, to?: string) {
  const day = value.includes("T") ? value.slice(0, 10) : value
  return (!from || day >= from) && (!to || day <= to)
}
