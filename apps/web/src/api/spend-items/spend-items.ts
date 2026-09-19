import { client } from "@/api/client"
import type {
  SpendItem,
  SpendItemUpdate,
  SpendPeriod,
  SpendQuery,
  SpendSummary,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"

function toParams(query: SpendQuery, period?: SpendPeriod) {
  const params = new URLSearchParams()
  params.set("spent_from", query.spent_from)
  params.set("spent_to", query.spent_to)
  if (query.source) params.set("source", query.source)
  if (query.q) params.set("q", query.q)
  for (const category of query.category ?? []) {
    params.append("category", category)
  }
  if (period) params.set("period", period)
  return params
}

export async function getSpendItems(
  query: SpendQuery,
  signal?: AbortSignal
): Promise<SpendItem[]> {
  const { data } = await client.get<SpendItem[]>("/spend-items", {
    params: toParams(query),
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

export async function deleteSpendItem(id: string): Promise<void> {
  await client.delete(`/spend-items/${id}`)
}
