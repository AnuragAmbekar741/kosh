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
