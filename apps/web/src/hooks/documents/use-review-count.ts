import { useDocumentInbox } from "@/hooks/documents/use-documents"

/** Extracted bills waiting for review: the bell's inbox query, read only. */
export function useReviewCount() {
  const inbox = useDocumentInbox()
  return (inbox.data ?? []).filter(
    (document) => document.status === "ready" && document.needs_review
  ).length
}
