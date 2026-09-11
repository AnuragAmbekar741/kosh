import { useQuery } from "@tanstack/react-query"

import { getSpendItems } from "@/api/spend-items/spend-items"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

export function useSpendItems() {
  return useQuery({
    queryKey: spendItemQueryKeys.all,
    queryFn: ({ signal }) => getSpendItems(signal),
  })
}
