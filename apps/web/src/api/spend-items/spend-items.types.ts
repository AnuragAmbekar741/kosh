export type Category =
  | "Groceries"
  | "Dining out"
  | "Household"
  | "Personal care"
  | "Health"
  | "Baby & kids"
  | "Pet"
  | "Shopping"
  | "Transport"
  | "Housing"
  | "Utilities"
  | "Entertainment"
  | "Travel"
  | "Other"

export type ItemStatus =
  | "none"
  | "pending"
  | "processing"
  | "resolved"
  | "needs_review"
  | "not_product"
  | "failed"

export type SpendItemCatalog = {
  id: string
  name: string
  family: string | null
}

export type SpendItem = {
  id: string
  merchant: string
  description: string | null
  amount: string
  currency: string
  spent_at: string
  category: Category | null
  item: SpendItemCatalog | null
  item_status: ItemStatus
  source: string
  status: string
  document_id: string | null
  line_index: number | null
  user_edited: boolean
  created_at: string
  updated_at: string
}

export type ItemCorrection =
  | { catalog_item_id: string }
  | { new_item: { name: string; family_id: string } }
  | { not_product: true }

export type SpendItemUpdate = Partial<
  Pick<
    SpendItem,
    "merchant" | "description" | "amount" | "currency" | "spent_at" | "category"
  >
>

export type SpendPeriod = "day" | "week" | "month" | "custom"

export type SpendSource = "manual" | "document"

export type PageParams = {
  skip: number
  limit: number
}

export type Paginated<T> = {
  data: T[]
  total: number
}

export type SpendQuery = {
  spent_from?: string
  spent_to?: string
  category?: Category[]
  source?: SpendSource
  q?: string
}

export type SpendSummaryQuery = SpendQuery & {
  period?: SpendPeriod
}

export type SpendSummaryComparison = {
  delta_percent: number
  previous_label: string
}

export type SpendSummary = {
  currency: string
  total: string
  bill_count: number
  item_count: number
  avg_per_bill: string
  has_spend: boolean
  comparison: SpendSummaryComparison | null
}

export type TrendBucket = "day" | "week" | "month"

export type SpendAnalytics = {
  currency: string
  total: string
  bill_count: number
  item_count: number
  avg_per_bill: string
  daily_average: string
  has_spend: boolean
  comparison: {
    previous_total: string
    /** null when the previous period had no spend */
    delta_percent: number | null
    previous_from: string
    previous_to: string
  } | null
  bucket: TrendBucket
  trend: { start: string; total: string }[]
  categories: {
    category: Category
    total: string
    share: number
    item_count: number
  }[]
  merchants: { merchant: string; total: string; bill_count: number }[]
  largest_bills: {
    document_id: string | null
    merchant: string
    spent_at: string
    total: string
    item_count: number
  }[]
  /** Monday first */
  weekdays: { weekday: number; total: string }[]
}
