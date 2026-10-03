import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  correctSpendItemItem,
  deleteSpendItem,
  getSpendAnalytics,
  getSpendItems,
  getSpendSummary,
  updateSpendItem,
} from "@/api/spend-items/spend-items"
import type {
  PageParams,
  SpendAnalyticsQuery,
  SpendQuery,
  SpendSummaryQuery,
} from "@/api/spend-items/spend-items.types"
import { catalogQueryKeys } from "@/hooks/catalog/query-keys"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

export function useSpendItems(query: SpendQuery, page: PageParams) {
  return useQuery({
    queryKey: spendItemQueryKeys.list(query, page),
    queryFn: ({ signal }) => getSpendItems(query, page, signal),
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

export function useSpendAnalytics(query: SpendAnalyticsQuery) {
  return useQuery({
    queryKey: spendItemQueryKeys.analytics(query),
    queryFn: ({ signal }) => getSpendAnalytics(query, signal),
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

export function useCorrectSpendItemItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: correctSpendItemItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all })
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
