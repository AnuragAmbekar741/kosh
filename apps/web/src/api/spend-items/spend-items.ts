import { client } from "@/api/client"
import type {
  SpendItem,
  SpendItemUpdate,
} from "@/api/spend-items/spend-items.types"

export async function getSpendItems(
  signal?: AbortSignal
): Promise<SpendItem[]> {
  const { data } = await client.get<SpendItem[]>("/spend-items", { signal })
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
