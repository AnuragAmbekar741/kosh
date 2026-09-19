import type {
  SpendQuery,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"

export const spendItemQueryKeys = {
  all: ["spend-items"] as const,
  list: (query: SpendQuery) => ["spend-items", "list", query] as const,
  summary: (query: SpendSummaryQuery) =>
    ["spend-items", "summary", query] as const,
}
