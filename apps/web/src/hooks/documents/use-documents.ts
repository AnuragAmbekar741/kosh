import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  addDocumentLineItem,
  confirmDocument,
  createManualDocument,
  deleteDocument,
  getDocument,
  getDocumentInbox,
  getDocuments,
  uploadDocument,
} from "@/api/documents/documents"
import type {
  DocumentDetail,
  DocumentSummary,
} from "@/api/documents/documents.types"
import { documentQueryKeys } from "@/hooks/documents/query-keys"
import { spendItemQueryKeys } from "@/hooks/spend-items/query-keys"

type UploadInput = { file: File; idempotencyKey: string }

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

const INBOX_POLL_MS = 3_000
const INBOX_SLOW_POLL_MS = 15_000
const INBOX_SLOW_AFTER_MS = 120_000

export function isInFlight(document: DocumentSummary) {
  return document.status === "uploaded" || document.status === "processing"
}

/** Polls only while the worker still owns a document; idle tabs make no calls. */
export function useDocumentInbox() {
  return useQuery({
    queryKey: documentQueryKeys.inbox,
    queryFn: ({ signal }) => getDocumentInbox(signal),
    refetchInterval: (query) => {
      const active = (query.state.data ?? []).filter(isInFlight)
      if (active.length === 0) return false
      const oldest = Math.min(
        ...active.map((document) => Date.parse(document.created_at))
      )
      // A stuck worker must not keep a tab polling fast forever.
      return Date.now() - oldest > INBOX_SLOW_AFTER_MS
        ? INBOX_SLOW_POLL_MS
        : INBOX_POLL_MS
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, idempotencyKey }: UploadInput) =>
      uploadDocument(file, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.all })
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

export function useCreateManualDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createManualDocument,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all }),
      ])
    },
  })
}

export function useAddDocumentLineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addDocumentLineItem,
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

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_data, documentId) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(documentId),
        }),
        queryClient.invalidateQueries({ queryKey: spendItemQueryKeys.all }),
      ])
    },
  })
}
