import type { Category, SpendItem } from "@/api/spend-items/spend-items.types"

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed"

/** `agent`: attached to a chat message and sent with it as `document_ids`. */
export type UploadSource = "dashboard" | "agent"

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
  /** The bill date (`YYYY-MM-DD`); set for manual bills and edited dates. */
  spent_at: string | null
  needs_review: boolean
}

export type ReceiptLineItem = {
  raw_description: string
  normalized_name: string | null
  upc: string | null
  quantity: number | null
  unit_price: string | number | null
  line_total: string | number
  category: Category
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
  category: Category
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

export type DuplicateBill = {
  document_id: string
  merchant: string
  spent_at: string
  total: string
  currency: string
  bill_number: string | null
  /** Same merchant and bill number; otherwise merchant, date, and total match. */
  certain: boolean
}

export type DocumentDetail = DocumentSummary & {
  content_hash: string
  bill_number: string | null
  hash_matches_existing: boolean
  possible_duplicates: DuplicateBill[]
  extraction: DocumentExtraction | null
  drafts: SpendItem[]
}

export type ConfirmDocumentInput = {
  documentId: string
}

export type ManualDocumentCreate = {
  title: string
  spent_at: string
}

export type UpdateDocumentInput = {
  documentId: string
  spent_at: string
}

export type AddDocumentLineItemInput = {
  documentId: string
  description: string
  amount: string
  category: Category
}
