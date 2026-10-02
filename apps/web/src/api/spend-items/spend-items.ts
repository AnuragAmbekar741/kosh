import { client } from "@/api/client"
import type {
  PageParams,
  Paginated,
  ItemCorrection,
  SpendItem,
  SpendAnalytics,
  SpendItemUpdate,
  SpendPeriod,
  SpendQuery,
  SpendSummary,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"

function toParams(query: SpendQuery, period?: SpendPeriod, page?: PageParams) {
  const params = new URLSearchParams()
  if (query.spent_from) params.set("spent_from", query.spent_from)
  if (query.spent_to) params.set("spent_to", query.spent_to)
  if (query.source) params.set("source", query.source)
  if (query.q) params.set("q", query.q)
  for (const category of query.category ?? []) {
    params.append("category", category)
  }
  if (period) params.set("period", period)
  if (page) {
    params.set("skip", String(page.skip))
    params.set("limit", String(page.limit))
  }
  return params
}

export async function getSpendItems(
  query: SpendQuery,
  page: PageParams,
  signal?: AbortSignal
): Promise<Paginated<SpendItem>> {
  const { data } = await client.get<Paginated<SpendItem>>("/spend-items", {
    params: toParams(query, undefined, page),
    signal,
  })
  return data
}

export async function getSpendSummary(
  query: SpendSummaryQuery,
  signal?: AbortSignal
): Promise<SpendSummary> {
  const { data } = await client.get<SpendSummary>("/spend-items/summary", {
    params: toParams(query, query.period),
    signal,
  })
  return data
}

export async function getSpendAnalytics(
  query: SpendQuery,
  signal?: AbortSignal
): Promise<SpendAnalytics> {
  const { data } = await client.get<SpendAnalytics>("/spend-items/analytics", {
    params: toParams(query),
    signal,
  })
  return data
}

export async function updateSpendItem({
  id,
  updates,
}: {
  id: string
  updates: SpendItemUpdate
}): Promise<SpendItem> {
  const { data } = await client.patch<SpendItem>(`/spend-items/${id}`, updates)
  return data
}

export async function correctSpendItemItem({
  id,
  correction,
}: {
  id: string
  correction: ItemCorrection
}): Promise<SpendItem> {
  const { data } = await client.put<SpendItem>(
    `/spend-items/${id}/item`,
    correction
  )
  return data
}

export async function deleteSpendItem(id: string): Promise<void> {
  await client.delete(`/spend-items/${id}`)
}
