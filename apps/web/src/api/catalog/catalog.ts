import type { CatalogEntry } from "@/api/catalog/catalog.types"
import { client } from "@/api/client"

export async function searchCatalog(
  q: string,
  signal?: AbortSignal
): Promise<CatalogEntry[]> {
  const { data } = await client.get<CatalogEntry[]>("/catalog/search", {
    params: { q },
    signal,
  })
  return data
}
