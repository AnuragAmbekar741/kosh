import { useState } from "react"
import { BellIcon } from "lucide-react"
import { toast } from "sonner"

import { apiDetail } from "@/api/client"
import { groupNotifications } from "@/components/notifications/notification-items"
import { NotificationList } from "@/components/notifications/NotificationList"
import { ReviewDocumentDialog } from "@/components/notifications/ReviewDocumentDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import {
  useDeleteDocument,
  useDocumentInbox,
} from "@/hooks/documents/use-documents"
import { useReadyToasts } from "@/hooks/documents/use-ready-toasts"
import { useUploads } from "@/hooks/documents/use-uploads"

function bellLabel(needsYou: number, busy: boolean) {
  const parts = ["Notifications"]
  if (needsYou) parts.push(`${needsYou} need${needsYou === 1 ? "s" : ""} you`)
  if (busy) parts.push("uploads in progress")
  return parts.join(", ")
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const inbox = useDocumentInbox()
  const uploads = useUploads()
  const deleteDocument = useDeleteDocument()
  const groups = groupNotifications(uploads.uploads, inbox.data ?? [])
  const needsYou = groups.needsYou.length
  const busy = groups.inProgress.length > 0

  function review(documentId: string) {
    setOpen(false)
    setReviewId(documentId)
  }

  useReadyToasts(inbox.data, review)

  function removeDocument(documentId: string) {
    deleteDocument.mutate(documentId, {
      onError: (error) =>
        toast.error(apiDetail(error) ?? "Couldn’t remove this document."),
    })
  }

  return (
    <>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              aria-label={bellLabel(needsYou, busy)}
              className="relative"
              size="icon"
              variant="ghost"
            />
          }
        >
          <BellIcon />
          {needsYou ? (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 tabular-nums">
              {needsYou}
            </Badge>
          ) : busy ? (
            <Spinner
              aria-hidden
              className="absolute top-1 right-1 size-3"
              role={undefined}
            />
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] gap-0 p-0 sm:w-96"
        >
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Notifications</h2>
          </div>
          <div className="max-h-[min(28rem,70svh)] overflow-y-auto overscroll-contain p-2">
            <NotificationList
              groups={groups}
              onRemoveDocument={removeDocument}
              onRemoveUpload={uploads.remove}
              onRetryUpload={uploads.retry}
              onReview={review}
              removingId={
                deleteDocument.isPending
                  ? (deleteDocument.variables ?? null)
                  : null
              }
            />
          </div>
        </PopoverContent>
      </Popover>
      <ReviewDocumentDialog
        documentId={reviewId}
        onClose={() => setReviewId(null)}
      />
    </>
  )
}
