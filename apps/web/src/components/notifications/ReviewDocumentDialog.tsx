import { useLocation } from "react-router"
import { toast } from "sonner"

import {
  type ConfirmedBill,
  DocumentReview,
} from "@/components/spending/DocumentReview"
import { formatDate } from "@/components/spending/spending-formatters"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"

type ReviewDocumentDialogProps = {
  documentId: string | null
  onClose: () => void
}

/** The existing extraction review, opened from a notification instead of the add dialog. */
export function ReviewDocumentDialog({
  documentId,
  onClose,
}: ReviewDocumentDialogProps) {
  const { pathname } = useLocation()
  const filters = useSpendFilters()

  function confirmed({ merchant, spentAt }: ConfirmedBill) {
    // Never change the date filter on its own: other bills would seem to vanish.
    if (
      pathname.startsWith("/spending/") &&
      spentAt &&
      !filters.isInView(spentAt)
    ) {
      toast.success(`Saved ${merchant}`, {
        description: `Dated ${formatDate(spentAt)}, outside your date filter.`,
        action: { label: "Show", onClick: filters.revealDate },
      })
    } else {
      toast.success(`Saved ${merchant}`)
    }
    onClose()
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open={documentId !== null}
    >
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0">
        <div className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col">
          <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
            <DialogTitle className="text-lg">Review bill</DialogTitle>
            <DialogDescription>
              Check the extracted items, then add them to your spending.
            </DialogDescription>
          </DialogHeader>
          {documentId ? (
            <DocumentReview
              documentId={documentId}
              key={documentId}
              onBack={onClose}
              onConfirmed={confirmed}
              onTryAnother={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
