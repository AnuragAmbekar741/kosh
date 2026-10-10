import type { DocumentSummary } from "@/api/documents/documents.types"
import type { Upload } from "@/hooks/documents/use-uploads"

export type NotificationStage =
  "uploading" | "upload-failed" | "waiting" | "extracting" | "ready" | "failed"

export type NotificationItem = {
  /** Upload key before the API accepts the file, document id after. */
  id: string
  title: string
  isPdf: boolean
  stage: NotificationStage
  detail: string
}

export type NotificationGroups = {
  needsYou: NotificationItem[]
  inProgress: NotificationItem[]
}

const NEEDS_YOU = new Set<NotificationStage>([
  "upload-failed",
  "ready",
  "failed",
])

function looksLikePdf(name: string, mimeType: string) {
  return mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")
}

function fromUpload(upload: Upload): NotificationItem {
  const base = {
    id: upload.key,
    title: upload.file.name,
    isPdf: looksLikePdf(upload.file.name, upload.file.type),
  }
  if (upload.status === "failed") {
    return {
      ...base,
      stage: "upload-failed",
      detail: upload.error ?? "Upload failed",
    }
  }
  return {
    ...base,
    stage: "uploading",
    detail: upload.status === "uploading" ? "Uploading…" : "Waiting to upload",
  }
}

function fromDocument(document: DocumentSummary): NotificationItem | null {
  const base = {
    id: document.id,
    title: document.filename,
    isPdf: looksLikePdf(document.filename, document.mime_type),
  }
  switch (document.status) {
    case "uploaded":
      return { ...base, stage: "waiting", detail: "Waiting to extract" }
    case "processing":
      return { ...base, stage: "extracting", detail: "Extracting…" }
    case "failed":
      return {
        ...base,
        stage: "failed",
        detail: "Couldn’t read this document",
      }
    case "ready":
      return document.needs_review
        ? { ...base, stage: "ready", detail: "Ready to review" }
        : null
  }
}

/** Browser uploads first (newest activity), then the inbox in its newest-first order. */
export function groupNotifications(
  uploads: Upload[],
  documents: DocumentSummary[]
): NotificationGroups {
  const items = [
    ...uploads.map(fromUpload),
    ...documents.flatMap((document) => fromDocument(document) ?? []),
  ]
  return {
    needsYou: items.filter((item) => NEEDS_YOU.has(item.stage)),
    inProgress: items.filter((item) => !NEEDS_YOU.has(item.stage)),
  }
}
