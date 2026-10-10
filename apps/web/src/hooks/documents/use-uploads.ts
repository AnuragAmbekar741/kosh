import { createContext, useContext, useEffect, useRef, useState } from "react"
import axios from "axios"

import { apiDetail } from "@/api/client"
import { useUploadDocument } from "@/hooks/documents/use-documents"

/** Matches the API's MAX_IN_FLIGHT_DOCUMENTS; the server enforces it too. */
export const MAX_PENDING_DOCUMENTS = 5

function uploadError(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status === 413) return "Larger than the 15 MB limit"
  if (status === 415) return "Not a PDF, HEIC, or image file"
  if (status === 429) {
    return `${MAX_PENDING_DOCUMENTS} documents are processing. Retry in a moment.`
  }
  return apiDetail(error) ?? "Upload failed. Check your connection."
}

export type UploadStatus = "waiting" | "uploading" | "failed"

export type Upload = {
  key: string
  file: File
  status: UploadStatus
  error?: string
}

/**
 * Files the browser still holds, before the API answers 202. Once accepted,
 * a file leaves this list and the document inbox shows it instead.
 * Owned once by AppShell so uploads survive closing the dialog or changing page.
 */
export function useUploadsState() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const current = useRef<Upload[]>([])
  const draining = useRef(false)
  const upload = useUploadDocument()

  function commit(next: Upload[]) {
    current.current = next
    setUploads(next)
  }

  function patch(key: string, changes: Partial<Upload>) {
    commit(
      current.current.map((item) =>
        item.key === key ? { ...item, ...changes } : item
      )
    )
  }

  // One file at a time: the worker extracts serially, so parallel sends gain nothing.
  async function drain() {
    if (draining.current) return
    draining.current = true
    try {
      for (;;) {
        const next = current.current.find((item) => item.status === "waiting")
        if (!next) break
        patch(next.key, { status: "uploading", error: undefined })
        try {
          await upload.mutateAsync({
            file: next.file,
            idempotencyKey: next.key,
          })
          commit(current.current.filter((item) => item.key !== next.key))
        } catch (error) {
          patch(next.key, {
            status: "failed",
            error: uploadError(error),
          })
        }
      }
    } finally {
      draining.current = false
    }
  }

  function add(files: File[]) {
    commit([
      ...current.current,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        status: "waiting" as const,
      })),
    ])
    void drain()
  }

  function retry(key: string) {
    // Same key: if the first attempt did reach the API, it returns that document.
    patch(key, { status: "waiting", error: undefined })
    void drain()
  }

  function remove(key: string) {
    commit(
      current.current.filter(
        (item) => item.key !== key || item.status === "uploading"
      )
    )
  }

  const sending = uploads.some((item) => item.status !== "failed")

  useEffect(() => {
    if (!sending) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [sending])

  return { uploads, sending, add, retry, remove }
}

export type UploadsState = ReturnType<typeof useUploadsState>

export const UploadsContext = createContext<UploadsState | null>(null)

export function useUploads(): UploadsState {
  const value = useContext(UploadsContext)
  if (!value) throw new Error("useUploads must be used inside AppShell")
  return value
}
