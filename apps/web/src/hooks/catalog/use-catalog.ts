import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { searchCatalog } from "@/api/catalog/catalog"
import { catalogQueryKeys } from "@/hooks/catalog/query-keys"

export function useCatalogSearch(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: catalogQueryKeys.search(term),
    queryFn: ({ signal }) => searchCatalog(term, signal),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  })
}
