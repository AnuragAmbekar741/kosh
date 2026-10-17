import { createContext, useContext, useEffect, useRef, useState } from "react"

import type { UploadsState } from "@/hooks/documents/use-uploads"
import { randomId } from "@/lib/utils"
import { shrinkImage } from "@/lib/shrink-image"

/** Matches the API's MAX_IN_FLIGHT_DOCUMENTS and the add dialog. */
export const MAX_SCAN_FILES = 5

export type ScanPage = {
  /** Upload key; `uploads.accepted[key]` is the document once the API has it. */
  key: string
  name: string
  /** Object URL of the shrunk image; null for PDFs. */
  preview: string | null
}

export type ChatScan = {
  id: string
  pages: ScanPage[]
}

type Send = (text: string, documentIds: string[]) => void

/**
 * Photos sent from the phone chat. Each photo uploads as its own document
 * (`source=agent`) through the same queue as the add dialog. When every page
 * has settled, the uploaded ones are sent as a chat message with their
 * `document_ids` (after the current reply, if one is streaming), and the agent
 * reads the bills and offers a card. A page that succeeds later, on Retry,
 * goes out on its own. Previews live for the session; after a reload the
 * thread shows file tiles.
 */
export function useChatScansState(uploads: UploadsState, send: Send) {
  const [scans, setScans] = useState<ChatScan[]>([])
  const [previews, setPreviews] = useState<Record<string, string | null>>({})
  // Upload callbacks run long after this render; they call the latest send.
  const latestSend = useRef(send)
  useEffect(() => {
    latestSend.current = send
  })

  function deliver(scanId: string, pages: ScanPage[], documentIds: string[]) {
    const keys = new Set(pages.map((page) => page.key))
    setPreviews((current) => ({
      ...current,
      ...Object.fromEntries(
        pages.map((page, index) => [documentIds[index], page.preview])
      ),
    }))
    // Failed pages stay in the thread with Retry; sent ones become a message.
    setScans((current) =>
      current.flatMap((scan) => {
        if (scan.id !== scanId) return [scan]
        const left = scan.pages.filter((page) => !keys.has(page.key))
        return left.length ? [{ ...scan, pages: left }] : []
      })
    )
    latestSend.current("", documentIds)
  }

  async function add(list: FileList | File[]) {
    const files = Array.from(list).slice(0, MAX_SCAN_FILES)
    if (files.length === 0) return
    const shrunk = await Promise.all(files.map(shrinkImage))
    const scanId = randomId()
    const settled = new Map<string, string | null>()
    let sent = false
    let pages: ScanPage[] = []

    function onSettled(key: string, documentId: string | null) {
      if (sent) {
        const page = pages.find((item) => item.key === key)
        if (page && documentId) deliver(scanId, [page], [documentId])
        return
      }
      settled.set(key, documentId)
      if (settled.size < pages.length) return
      sent = true
      const uploaded = pages.filter((page) => settled.get(page.key))
      if (uploaded.length) {
        deliver(
          scanId,
          uploaded,
          uploaded.map((page) => settled.get(page.key) as string)
        )
      }
    }

    const keys = uploads.add(shrunk, "agent", onSettled)
    pages = shrunk.map((file, index) => ({
      key: keys[index],
      name: file.name,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }))
    setScans((current) => [...current, { id: scanId, pages }])
  }

  return { scans, previews, add }
}

export type ChatScansState = ReturnType<typeof useChatScansState>

export const ChatScansContext = createContext<ChatScansState | null>(null)

export function useChatScans(): ChatScansState {
  const value = useContext(ChatScansContext)
  if (!value) throw new Error("useChatScans must be used inside AppShell")
  return value
}
