import type { SpendPeriod } from "@/api/spend-items/spend-items.types"

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

export function rangeForPeriod(period: SpendPeriod, anchor: Date): DateRange {
  if (period === "day") {
    const iso = toIsoDate(anchor)
    return { from: iso, to: iso }
  }
  if (period === "week") {
    const weekday = anchor.getDay()
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday
    const start = new Date(anchor)
    start.setDate(anchor.getDate() + mondayOffset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }
  return currentMonthRange(anchor)
}

export function shiftRange(
  period: SpendPeriod,
  from: string,
  to: string,
  direction: -1 | 1
): DateRange {
  const start = fromIsoDate(from)
  const end = fromIsoDate(to)
  if (period === "day") {
    start.setDate(start.getDate() + direction)
    return { from: toIsoDate(start), to: toIsoDate(start) }
  }
  if (period === "week") {
    start.setDate(start.getDate() + direction * 7)
    end.setDate(end.getDate() + direction * 7)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }
  if (period === "month") {
    return currentMonthRange(
      new Date(start.getFullYear(), start.getMonth() + direction, 1)
    )
  }
  const days =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  start.setDate(start.getDate() + direction * days)
  end.setDate(end.getDate() + direction * days)
  return { from: toIsoDate(start), to: toIsoDate(end) }
}

export function periodLabel(period: SpendPeriod, from: string, to: string) {
  const start = fromIsoDate(from)
  if (period === "day") {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(start)
  }
  if (period === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(start)
  }
  const end = fromIsoDate(to)
  const startText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(start)
  const endText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(end)
  return `${startText} – ${endText}`
}

export function spentInLabel(period: SpendPeriod, from: string, to: string) {
  if (period === "month") {
    const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
      fromIsoDate(from)
    )
    return `spent in ${month}`
  }
  if (period === "day") {
    return `spent on ${periodLabel("day", from, to)}`
  }
  return `spent ${periodLabel(period, from, to)}`
}

export function dateInRange(value: string, from: string, to: string) {
  const day = value.includes("T") ? value.slice(0, 10) : value
  return day >= from && day <= to
}

export function anchorDate(from: string, to: string) {
  const today = toIsoDate(new Date())
  if (today >= from && today <= to) return new Date()
  return fromIsoDate(from)
}
