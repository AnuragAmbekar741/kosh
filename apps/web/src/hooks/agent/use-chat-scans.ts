import { createContext, useContext, useState } from "react"

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

/**
 * Photos sent from the phone chat. Each photo uploads as its own document
 * through the same queue as the add dialog; the thread follows them here.
 * Lives for the session only: the bell still tracks documents after a reload.
 */
export function useChatScansState(uploads: UploadsState) {
  const [scans, setScans] = useState<ChatScan[]>([])

  async function add(list: FileList | File[]) {
    const files = Array.from(list).slice(0, MAX_SCAN_FILES)
    if (files.length === 0) return
    const shrunk = await Promise.all(files.map(shrinkImage))
    const keys = uploads.add(shrunk)
    const pages = shrunk.map((file, index) => ({
      key: keys[index],
      name: file.name,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }))
    setScans((current) => [...current, { id: randomId(), pages }])
  }

  return { scans, add }
}

export type ChatScansState = ReturnType<typeof useChatScansState>

export const ChatScansContext = createContext<ChatScansState | null>(null)

export function useChatScans(): ChatScansState {
  const value = useContext(ChatScansContext)
  if (!value) throw new Error("useChatScans must be used inside AppShell")
  return value
}
