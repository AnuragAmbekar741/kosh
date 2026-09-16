import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  deleteSpendItem,
  getSpendItems,
  updateSpendItem,
} from "@/api/spend-items/spend-items"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
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
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<SpendItem[]>(spendItemQueryKeys.all, (items) =>
        items?.filter((item) => item.id !== deletedId)
      )
      void queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all })
    },
  })
}

export function useUpdateSpendItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSpendItem,
    onSuccess: (updated) => {
      queryClient.setQueryData<SpendItem[]>(spendItemQueryKeys.all, (items) =>
        items?.map((item) => (item.id === updated.id ? updated : item))
      )
      void queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all })
    },
  })
}
