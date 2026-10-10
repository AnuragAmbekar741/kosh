import { useEffect, useRef } from "react"
import { toast } from "sonner"

import type {
  DocumentStatus,
  DocumentSummary,
} from "@/api/documents/documents.types"

/**
 * Toasts when the worker finishes a document while the user is elsewhere.
 * Compares with the previous inbox, so items already finished on first load stay quiet.
 */
export function useReadyToasts(
  documents: DocumentSummary[] | undefined,
  onReview: (documentId: string) => void
) {
  const previous = useRef<Map<string, DocumentStatus> | null>(null)

  useEffect(() => {
    if (!documents) return
    const before = previous.current
    previous.current = new Map(documents.map((d) => [d.id, d.status]))
    if (!before) return

    for (const document of documents) {
      const was = before.get(document.id)
      if (was === document.status || was === "ready" || was === "failed") {
        continue
      }
      if (document.status === "ready" && document.needs_review) {
        toast(`${document.filename} is ready to review`, {
          action: { label: "Review", onClick: () => onReview(document.id) },
        })
      } else if (document.status === "failed") {
        toast.error(`Couldn’t read ${document.filename}`, {
          description: "Remove it from notifications and try a clearer file.",
        })
      }
    }
  }, [documents, onReview])
}
