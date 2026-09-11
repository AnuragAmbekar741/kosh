import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  confirmDocument,
  getDocument,
  getDocuments,
  uploadDocument,
} from "@/api/documents/documents"
import type { DocumentDetail } from "@/api/documents/documents.types"
import { documentQueryKeys } from "@/hooks/documents/query-keys"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

export function useDocuments() {
  return useQuery({
    queryKey: documentQueryKeys.all,
    queryFn: ({ signal }) => getDocuments(signal),
  })
}

export function useDocument(documentId: string | null) {
  return useQuery<DocumentDetail>({
    queryKey: documentQueryKeys.detail(documentId ?? ""),
    queryFn: ({ signal }) => getDocument(documentId!, signal),
    enabled: Boolean(documentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "uploaded" || status === "processing" ? 2_000 : false
    },
  })
}

export function useUploadDocuments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map(uploadDocument)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.all })
    },
  })
}

export function useConfirmDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: confirmDocument,
    onSuccess: (_data, input) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(input.documentId),
        }),
        queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all }),
      ])
    },
  })
}
