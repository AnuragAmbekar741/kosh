import type { TrendBucket } from "@/api/spend-items/spend-items.types"
import { fromIsoDate } from "@/components/spending/spend-period"

export function formatCompactMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: amount < 1000 ? 0 : 1,
  }).format(amount)
}

/** Axis tick for a trend bucket start. */
export function formatBucketTick(iso: string, bucket: TrendBucket) {
  return new Intl.DateTimeFormat(
    undefined,
    bucket === "month"
      ? { month: "short", year: "2-digit" }
      : { month: "short", day: "numeric" }
  ).format(fromIsoDate(iso))
}

/** Tooltip title for a trend bucket start. */
export function formatBucketLabel(iso: string, bucket: TrendBucket) {
  const date = fromIsoDate(iso)
  if (bucket === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(date)
  }
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: bucket === "day" ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
  return bucket === "week" ? `Week of ${day}` : day
}

export const BUCKET_LABELS: Record<TrendBucket, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
