import axios from "axios"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileTextIcon,
  ReceiptTextIcon,
} from "lucide-react"
import { useState } from "react"

import { ReviewDocumentDialog } from "@/components/notifications/ReviewDocumentDialog"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { MessageScrollerItem } from "@/components/ui/message-scroller"
import {
  type ChatScan,
  type ScanPage,
  useChatScans,
} from "@/hooks/agent/use-chat-scans"
import { useDocument } from "@/hooks/documents/use-documents"
import { useUploads } from "@/hooks/documents/use-uploads"

type PageStatusProps = {
  page: ScanPage
  onReview: (documentId: string) => void
}

/** One photo's progress: uploading → reading → ready to review → saved. */
function PageStatus({ page, onReview }: PageStatusProps) {
  const uploads = useUploads()
  const upload = uploads.uploads.find((item) => item.key === page.key)
  const documentId = uploads.accepted[page.key] ?? null
  const document = useDocument(documentId)
  const data = document.data
  const title =
    data?.extraction && "merchant" in data.extraction
      ? data.extraction.merchant
      : page.name

  if (upload?.status === "failed") {
    return (
      <Marker>
        <MarkerIcon>
          <CircleAlertIcon />
        </MarkerIcon>
        <MarkerContent>
          {page.name}: {upload.error}
        </MarkerContent>
        <Button
          className="ml-auto"
          onClick={() => uploads.retry(page.key)}
          size="xs"
          variant="ghost"
        >
          Retry
        </Button>
      </Marker>
    )
  }
  if (!documentId) {
    return (
      <Marker aria-live="polite">
        <MarkerContent className="shimmer">
          Uploading {page.name}…
        </MarkerContent>
      </Marker>
    )
  }
  if (
    axios.isAxiosError(document.error) &&
    document.error.response?.status === 404
  ) {
    return (
      <Marker>
        <MarkerContent>Discarded {page.name}</MarkerContent>
      </Marker>
    )
  }
  if (!data || data.status === "uploaded" || data.status === "processing") {
    return (
      <Marker aria-live="polite">
        <MarkerContent className="shimmer">Reading your bill…</MarkerContent>
      </Marker>
    )
  }
  if (data.status === "failed") {
    return (
      <Marker>
        <MarkerIcon>
          <CircleAlertIcon />
        </MarkerIcon>
        <MarkerContent>
          Couldn’t read {page.name}. {data.error ?? "Try a clearer photo."}
        </MarkerContent>
      </Marker>
    )
  }
  if (data.needs_review) {
    return (
      <Marker>
        <MarkerIcon>
          <ReceiptTextIcon />
        </MarkerIcon>
        <MarkerContent>{title} is ready to review</MarkerContent>
        <Button
          className="ml-auto"
          onClick={() => onReview(data.id)}
          size="sm"
          variant="outline"
        >
          Review
        </Button>
      </Marker>
    )
  }
  return (
    <Marker>
      <MarkerIcon>
        <CircleCheckIcon />
      </MarkerIcon>
      <MarkerContent>Saved {title}</MarkerContent>
    </Marker>
  )
}

type ScanItemProps = {
  scan: ChatScan
  onReview: (documentId: string) => void
}

function ScanItem({ scan, onReview }: ScanItemProps) {
  return (
    <MessageScrollerItem messageId={scan.id} scrollAnchor>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-end gap-2">
          {scan.pages.map((page) =>
            page.preview ? (
              <img
                alt={page.name}
                className="h-24 w-18 rounded-lg object-cover ring-1 ring-border"
                key={page.key}
                src={page.preview}
              />
            ) : (
              <span
                aria-label={page.name}
                className="flex h-24 w-18 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border"
                key={page.key}
              >
                <FileTextIcon className="size-5" />
              </span>
            )
          )}
        </div>
        {scan.pages.map((page) => (
          <PageStatus key={page.key} onReview={onReview} page={page} />
        ))}
      </div>
    </MessageScrollerItem>
  )
}

/** Photos sent from the phone chat, after the conversation's messages. */
export function AgentScans() {
  const { scans } = useChatScans()
  const [reviewId, setReviewId] = useState<string | null>(null)

  return (
    <>
      {scans.map((scan) => (
        <ScanItem key={scan.id} onReview={setReviewId} scan={scan} />
      ))}
      <ReviewDocumentDialog
        documentId={reviewId}
        onClose={() => setReviewId(null)}
      />
    </>
  )
}
