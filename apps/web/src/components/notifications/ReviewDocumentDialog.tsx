import { toast } from "sonner"

import {
  type ConfirmedBill,
  DocumentReview,
} from "@/components/spending/DocumentReview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBillSavedToast } from "@/hooks/spend-items/use-bill-saved-toast"

type ReviewDocumentDialogProps = {
  documentId: string | null
  onClose: () => void
}

/** The existing extraction review, opened from a notification instead of the add dialog. */
export function ReviewDocumentDialog({
  documentId,
  onClose,
}: ReviewDocumentDialogProps) {
  const billSaved = useBillSavedToast()

  function confirmed({ merchant, spentAt }: ConfirmedBill) {
    billSaved(`Saved ${merchant}`, spentAt)
    onClose()
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open={documentId !== null}
    >
      {/* Phones: full screen, so Save and Discard sit at the bottom within reach. */}
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:rounded-none max-md:ring-0">
        <div className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col max-md:h-full max-md:max-h-none max-md:pb-[env(safe-area-inset-bottom)]">
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
              onConfirmed={confirmed}
              onDiscarded={(merchant) => {
                toast(`Discarded ${merchant}`)
                onClose()
              }}
              onTryAnother={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
