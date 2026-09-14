import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { deleteSpendItem, getSpendItems } from "@/api/spend-items/spend-items"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

export function useSpendItems() {
  return useQuery({
    queryKey: spendItemQueryKeys.all,
    queryFn: ({ signal }) => getSpendItems(signal),
  })
}

export function useDeleteSpendItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSpendItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all })
    },
  })
}
