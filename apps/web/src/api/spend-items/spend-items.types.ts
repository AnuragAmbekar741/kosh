export type SpendItem = {
  id: string
  merchant: string
  description: string | null
  amount: string
  currency: string
  spent_at: string
  category: string | null
  source: string
  status: string
  document_id: string | null
  line_index: number | null
  user_edited: boolean
  created_at: string
  updated_at: string
}

export type SpendItemUpdate = Partial<
  Pick<
    SpendItem,
    "merchant" | "description" | "amount" | "currency" | "spent_at" | "category"
  >
>

export type SpendPeriod = "day" | "week" | "month" | "custom"

export type SpendSource = "manual" | "document"

export type SpendQuery = {
  spent_from: string
  spent_to: string
  category?: string[]
  source?: SpendSource
  q?: string
}

export type SpendSummaryQuery = SpendQuery & {
  period: SpendPeriod
}

export type SpendSummaryComparison = {
  delta_percent: number
  previous_label: string
}

export type SpendSummaryCategory = {
  name: string
  amount: string
  percent: number
}

export type SpendSummary = {
  currency: string
  total: string
  bill_count: number
  item_count: number
  avg_per_bill: string
  has_spend: boolean
  comparison: SpendSummaryComparison | null
  categories: SpendSummaryCategory[]
}
