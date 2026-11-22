import type { BillAction } from "@/api/agent/agent.types"
import type { CatalogEntry } from "@/api/catalog/catalog.types"
import type {
  DocumentDetail,
  DocumentSummary,
} from "@/api/documents/documents.types"
import type {
  Category,
  SpendAnalytics,
  SpendItem,
  SpendSummary,
} from "@/api/spend-items/spend-items.types"

// Sample data for stories only. The mock API (mock-api.ts) serves it, and
// stories that take plain props import it directly.

export const CURRENCY = "INR"

const NOW = "2026-11-18T10:24:00Z"

type LineSeed = {
  description: string
  amount: string
  category: Category | null
  item?: SpendItem["item"]
  item_status?: SpendItem["item_status"]
}

function line(
  seed: LineSeed,
  index: number,
  overrides: Partial<SpendItem> = {}
): SpendItem {
  return {
    id: `line-${index + 1}`,
    merchant: "Nature's Basket",
    description: seed.description,
    amount: seed.amount,
    currency: CURRENCY,
    spent_at: "2026-11-18",
    category: seed.category,
    item: seed.item ?? null,
    item_status: seed.item_status ?? "none",
    source: "document",
    status: "draft",
    document_id: "doc-1",
    line_index: index,
    user_edited: false,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

/** Raw bill text, as the line text always is. Catalog items are tags only. */
const LINE_SEEDS: LineSeed[] = [
  {
    description: "AMUL TAAZA TONED MILK 1L",
    amount: "68.00",
    category: "Groceries",
    item: { id: "cat-milk", name: "Toned milk", family: "Milk" },
    item_status: "resolved",
  },
  {
    description: "BRIT WHT BREAD 400G",
    amount: "45.00",
    category: "Groceries",
    item: { id: "cat-bread", name: "White bread", family: "Bread" },
    item_status: "resolved",
  },
  {
    description: "SURF EXCEL MATIC FL 1L",
    amount: "229.00",
    category: "Household",
    item_status: "needs_review",
  },
  {
    description: "PEDIGREE ADULT CHKN 1.2KG",
    amount: "389.00",
    category: "Pet",
    item_status: "pending",
  },
  {
    description: "CARRY BAG",
    amount: "5.00",
    category: null,
    item_status: "not_product",
  },
]

export const billLines: SpendItem[] = LINE_SEEDS.map((seed, index) =>
  line(seed, index)
)

export const longLine = line(
  {
    description:
      "NESTLE EVERYDAY DAIRY WHITENER POUCH 400G + FREE 50G PROMO PACK (LIMITED EDITION)",
    amount: "1249.50",
    category: "Groceries",
  },
  9
)

export const billTotal = billLines
  .reduce((sum, item) => sum + Number(item.amount), 0)
  .toFixed(2)

export const documentSummary: DocumentSummary = {
  id: "doc-1",
  filename: "natures-basket-18-nov.jpg",
  mime_type: "image/jpeg",
  size_bytes: 482_113,
  status: "ready",
  source: "agent",
  error: null,
  created_at: NOW,
  processed_at: NOW,
  spent_at: "2026-11-18",
  needs_review: true,
}

export const documentDetail: DocumentDetail = {
  ...documentSummary,
  content_hash: "sha256:demo",
  bill_number: "NB-44120",
  hash_matches_existing: false,
  possible_duplicates: [],
  extraction: null,
  drafts: billLines,
}

export const inbox: DocumentSummary[] = [
  documentSummary,
  { ...documentSummary, id: "doc-2", filename: "swiggy-17-nov.pdf" },
]

export const billAction: BillAction = {
  tool: "review_document",
  kind: "review_document",
  document_id: "doc-1",
  merchant: "Nature's Basket",
  spent_at: "2026-11-18",
  line_count: billLines.length,
  totals: { [CURRENCY]: billTotal },
  possible_duplicates: 0,
}

export const spendSummary: SpendSummary = {
  currency: CURRENCY,
  total: "18432.75",
  bill_count: 23,
  item_count: 141,
  avg_per_bill: "801.42",
  has_spend: true,
  comparison: { delta_percent: -8.4, previous_label: "October" },
}

const TREND = [
  "1820.00",
  "640.50",
  "0",
  "2310.00",
  "980.25",
  "455.00",
  "3120.40",
  "760.00",
  "1405.10",
  "0",
  "520.00",
  "2675.80",
  "890.00",
  "1130.70",
]

export const analytics: SpendAnalytics = {
  currency: CURRENCY,
  currencies: [CURRENCY, "USD"],
  total: "18432.75",
  bill_count: 23,
  item_count: 141,
  avg_per_bill: "801.42",
  daily_average: "1023.99",
  has_spend: true,
  comparison: {
    previous_total: "20120.00",
    delta_percent: -8.4,
    previous_from: "2026-10-01",
    previous_to: "2026-10-18",
  },
  bucket: "day",
  trend: TREND.map((total, index) => ({
    start: `2026-11-${String(index + 1).padStart(2, "0")}`,
    total,
  })),
  categories: [
    { category: "Groceries", total: "7240.30", share: 0.393, item_count: 64 },
    { category: "Dining out", total: "4310.00", share: 0.234, item_count: 18 },
    { category: "Household", total: "2190.45", share: 0.119, item_count: 21 },
    { category: "Transport", total: "1880.00", share: 0.102, item_count: 12 },
    { category: "Pet", total: "1412.00", share: 0.077, item_count: 6 },
    { category: "Other", total: "1400.00", share: 0.075, item_count: 20 },
  ],
  merchants: [
    { merchant: "Nature's Basket", total: "6120.00", bill_count: 6 },
    { merchant: "Swiggy", total: "3890.00", bill_count: 9 },
    { merchant: "Uber", total: "1880.00", bill_count: 7 },
    { merchant: "Heads Up For Tails", total: "1412.00", bill_count: 2 },
    { merchant: "DMart", total: "1190.45", bill_count: 1 },
  ],
  largest_bills: [
    {
      document_id: "doc-1",
      merchant: "Nature's Basket",
      spent_at: "2026-11-07",
      total: "3120.40",
      item_count: 22,
    },
    {
      document_id: "doc-3",
      merchant: "DMart",
      spent_at: "2026-11-12",
      total: "2675.80",
      item_count: 31,
    },
    {
      document_id: null,
      merchant: "Rent top-up",
      spent_at: "2026-11-04",
      total: "2310.00",
      item_count: 1,
    },
  ],
  weekdays: [
    { weekday: 0, total: "2140.00" },
    { weekday: 1, total: "1820.50" },
    { weekday: 2, total: "2410.00" },
    { weekday: 3, total: "1980.25" },
    { weekday: 4, total: "2760.00" },
    { weekday: 5, total: "4310.00" },
    { weekday: 6, total: "3012.00" },
  ],
}

export const emptyAnalytics: SpendAnalytics = {
  ...analytics,
  total: "0",
  bill_count: 0,
  item_count: 0,
  avg_per_bill: "0",
  daily_average: "0",
  has_spend: false,
  comparison: null,
  trend: analytics.trend.map((point) => ({ ...point, total: "0" })),
  categories: [],
  merchants: [],
  largest_bills: [],
  weekdays: analytics.weekdays.map((day) => ({ ...day, total: "0" })),
}

export const catalog: CatalogEntry[] = [
  {
    id: "fam-milk",
    name: "Milk",
    family: null,
    category: "Groceries",
    is_family: true,
    mine: false,
  },
  {
    id: "cat-milk",
    name: "Toned milk",
    family: "Milk",
    category: "Groceries",
    is_family: false,
    mine: false,
  },
  {
    id: "cat-milk-full",
    name: "Full cream milk",
    family: "Milk",
    category: "Groceries",
    is_family: false,
    mine: false,
  },
  {
    id: "cat-detergent",
    name: "Liquid detergent",
    family: "Detergent",
    category: "Household",
    is_family: false,
    mine: true,
  },
  {
    id: "cat-dog-food",
    name: "Dry dog food",
    family: "Pet food",
    category: "Pet",
    is_family: false,
    mine: false,
  },
]
