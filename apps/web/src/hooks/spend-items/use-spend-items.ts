import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  deleteSpendItem,
  getSpendItems,
  getSpendSummary,
  updateSpendItem,
} from "@/api/spend-items/spend-items"
import type {
  SpendQuery,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

export function useSpendItems(query: SpendQuery) {
  return useQuery({
    queryKey: spendItemQueryKeys.list(query),
    queryFn: ({ signal }) => getSpendItems(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useSpendSummary(query: SpendSummaryQuery) {
  return useQuery({
    queryKey: spendItemQueryKeys.summary(query),
    queryFn: ({ signal }) => getSpendSummary(query, signal),
    placeholderData: keepPreviousData,
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

export function useUpdateSpendItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSpendItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all })
    },
  })
}
