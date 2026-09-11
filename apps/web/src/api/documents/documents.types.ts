import type { SpendItem } from "@/api/spend-items/spend-items.types"

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed"

export type DocumentSummary = {
  id: string
  filename: string
  mime_type: string
  size_bytes: number
  status: DocumentStatus
  source: string
  error: string | null
  created_at: string
  processed_at: string | null
}

export type ReceiptLineItem = {
  raw_description: string
  normalized_name: string | null
  upc: string | null
  quantity: number | null
  unit_price: string | number | null
  line_total: string | number
  confidence: number
  requires_review: boolean
}

export type ReceiptExtraction = {
  document_kind: "receipt"
  merchant: string
  store_location: string | null
  purchased_at: string
  currency: string
  subtotal: string | number | null
  tax: string | number | null
  total: string | number
  line_items: ReceiptLineItem[]
}

export type StatementTransaction = {
  merchant: string
  amount: string | number
  spent_at: string
  direction: "debit" | "credit"
  category: string | null
  confidence: number
  requires_review: boolean
}

export type StatementExtraction = {
  document_kind: "statement"
  institution: string | null
  period_start: string | null
  period_end: string | null
  currency: string
  transactions: StatementTransaction[]
}

export type DocumentExtraction = ReceiptExtraction | StatementExtraction

export type DocumentDetail = DocumentSummary & {
  content_hash: string
  hash_matches_existing: boolean
  extraction: DocumentExtraction | null
  drafts: SpendItem[]
}

export type ConfirmDocumentInput = {
  documentId: string
  mode: "total" | "line_items"
  itemIds?: string[]
}
