import type {
  PageParams,
  SpendQuery,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"

export const spendItemQueryKeys = {
  all: ["spend-items"] as const,
  list: (query: SpendQuery, page: PageParams) =>
    ["spend-items", "list", query, page] as const,
  summary: (query: SpendSummaryQuery) =>
    ["spend-items", "summary", query] as const,
}
