import { useMemo } from "react"
import { AlertTriangle, Check, ReceiptText } from "lucide-react"

import type { DocumentDetail } from "@/api/documents/documents.types"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmDocument } from "@/hooks/documents/use-documents"

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(amount))
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function draftName(item: SpendItem) {
  return item.description || item.merchant
}

type DocumentReviewDialogProps = {
  document: DocumentDetail
  onConfirmed: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function DocumentReviewDialog({
  document,
  onConfirmed,
  onOpenChange,
  open,
}: DocumentReviewDialogProps) {
  const isStatement = document.extraction?.document_kind === "statement"
  const lineDrafts = useMemo(
    () => document.drafts.filter((item) => item.line_index !== null),
    [document.drafts]
  )
  const totalDraft = document.drafts.find((item) => item.line_index === null)
  const confirm = useConfirmDocument()

  if (!document.extraction) return null

  const extraction = document.extraction
  const merchant =
    extraction.document_kind === "receipt"
      ? extraction.merchant
      : extraction.institution || "Statement"
  const date =
    extraction.document_kind === "receipt"
      ? extraction.purchased_at
      : extraction.period_end || extraction.period_start
  const currency = extraction.currency
  const total =
    extraction.document_kind === "receipt"
      ? extraction.total
      : lineDrafts.reduce((sum, item) => sum + Number(item.amount), 0)
  const itemizedTotal = lineDrafts.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  )
  const confirmationMode = lineDrafts.length > 0 ? "line_items" : "total"

  function save() {
    confirm.mutate(
      {
        documentId: document.id,
        mode: confirmationMode,
        itemIds:
          confirmationMode === "line_items"
            ? lineDrafts.map((item) => item.id)
            : totalDraft
              ? [totalDraft.id]
              : undefined,
      },
      { onSuccess: onConfirmed }
    )
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="text-xl font-normal">
            {isStatement ? "Review statement" : "Review bill"}
          </DialogTitle>
          <DialogDescription>
            Check the full extraction before adding it to Payments.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-lg font-medium">{merchant}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {date ? friendlyDate(date) : "No document date found"} ·{" "}
                {document.filename}
              </p>
            </div>
            <p className="text-3xl font-light tracking-tight">
              {money(total, currency)}
            </p>
          </div>

          {lineDrafts.length > 0 ? (
            <section className="py-6" aria-labelledby="extracted-items-title">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <h3
                    className="text-sm font-medium"
                    id="extracted-items-title"
                  >
                    {isStatement ? "Transactions" : "Bill items"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lineDrafts.length} extracted
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {money(itemizedTotal, currency)}
                </p>
              </div>
              <Accordion className="overflow-hidden rounded-xl border border-border">
                {lineDrafts.map((draft) => {
                  const extracted =
                    extraction.document_kind === "receipt"
                      ? extraction.line_items[draft.line_index ?? -1]
                      : extraction.transactions[draft.line_index ?? -1]
                  const needsReview = extracted?.requires_review
                  return (
                    <AccordionItem
                      className="px-4 transition-colors data-open:bg-muted/40"
                      key={draft.id}
                      value={draft.id}
                    >
                      <div className="flex items-center py-0.5">
                        <AccordionTrigger className="min-w-0 py-3.5 hover:no-underline">
                          <span className="min-w-0 pr-3">
                            <span className="block truncate">
                              {draftName(draft)}
                            </span>
                            {needsReview ? (
                              <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-amber-500">
                                <AlertTriangle className="size-3" /> Check this
                                item
                              </span>
                            ) : null}
                          </span>
                          <span className="mr-3 ml-auto tabular-nums">
                            {money(draft.amount, draft.currency)}
                          </span>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pr-8 pb-4 pl-7 text-xs leading-relaxed text-muted-foreground">
                        {extracted && "raw_description" in extracted ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <p>Receipt text: {extracted.raw_description}</p>
                            {extracted.quantity ? (
                              <p>Quantity: {extracted.quantity}</p>
                            ) : null}
                            {extracted.unit_price ? (
                              <p>
                                Unit price:{" "}
                                {money(extracted.unit_price, currency)}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p>
                            {draft.spent_at} ·{" "}
                            {draft.category || "Uncategorized"}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </section>
          ) : totalDraft ? (
            <div className="my-6 flex items-start gap-3 rounded-lg bg-muted p-4">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-brand-ink" />
              <div>
                <p className="text-sm font-medium">Bill total</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No item breakdown was found, so the complete bill will be
                  saved as one payment.
                </p>
              </div>
            </div>
          ) : null}

          {document.hash_matches_existing ? (
            <p className="flex items-center gap-2 border-t border-border pt-4 text-xs text-amber-500">
              <AlertTriangle className="size-3.5" /> A matching document was
              uploaded before.
            </p>
          ) : null}
          {confirm.isError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              We couldn’t save this document. Please try again.
            </p>
          ) : null}
        </div>

        <DialogFooter className="m-0 rounded-none px-5 py-4 sm:px-6">
          {confirmationMode === "line_items" ? (
            <span className="self-center text-xs text-muted-foreground sm:mr-auto">
              {lineDrafts.length} {lineDrafts.length === 1 ? "item" : "items"} ·{" "}
              {money(itemizedTotal, currency)}
            </span>
          ) : null}
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Review later
          </Button>
          <Button disabled={confirm.isPending} onClick={save}>
            {confirm.isPending ? "Saving…" : "Save to Payments"}
            {!confirm.isPending ? <Check data-icon="inline-end" /> : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
