import { useMemo, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmDocument } from "@/hooks/documents/use-documents"
import { cn } from "@/lib/utils"

type ConfirmationMode = "total" | "line_items"

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
  const [mode, setMode] = useState<ConfirmationMode>(
    isStatement ? "line_items" : "total"
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(lineDrafts.map((item) => item.id))
  )
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
  const selectedTotal = lineDrafts
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + Number(item.amount), 0)

  function toggleItem(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function save() {
    confirm.mutate(
      {
        documentId: document.id,
        mode,
        itemIds:
          mode === "line_items"
            ? Array.from(selected)
            : totalDraft
              ? [totalDraft.id]
              : undefined,
      },
      { onSuccess: onConfirmed }
    )
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="text-xl font-normal">
            Review your document
          </DialogTitle>
          <DialogDescription>
            Check what we found before adding it to Payments.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
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

          {!isStatement && totalDraft ? (
            <div
              className="my-5 grid grid-cols-2 rounded-lg bg-muted p-1"
              role="group"
              aria-label="Save mode"
            >
              {(["total", "line_items"] as const).map((value) => (
                <button
                  className={cn(
                    "h-9 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    mode === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={value}
                  onClick={() => setMode(value)}
                  type="button"
                >
                  {value === "total" ? "Save one total" : "Save itemized"}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "total" && totalDraft ? (
            <div className="my-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-brand-ink" />
              <div>
                <p className="text-sm font-medium">One payment will be added</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The receipt remains attached, and its individual items stay
                  visible here for reference.
                </p>
              </div>
            </div>
          ) : (
            <div className="my-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selected.size} of {lineDrafts.length} items selected
                </p>
                <button
                  className="text-xs text-brand-ink hover:underline"
                  onClick={() => {
                    setSelected(
                      selected.size === lineDrafts.length
                        ? new Set()
                        : new Set(lineDrafts.map((item) => item.id))
                    )
                  }}
                  type="button"
                >
                  {selected.size === lineDrafts.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              </div>
              <Accordion className="border-y border-border">
                {lineDrafts.map((draft) => {
                  const extracted =
                    extraction.document_kind === "receipt"
                      ? extraction.line_items[draft.line_index ?? -1]
                      : extraction.transactions[draft.line_index ?? -1]
                  const needsReview = extracted?.requires_review
                  return (
                    <AccordionItem key={draft.id} value={draft.id}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          aria-label={`Include ${draftName(draft)}`}
                          checked={selected.has(draft.id)}
                          onCheckedChange={(checked) =>
                            toggleItem(draft.id, checked)
                          }
                        />
                        <AccordionTrigger className="min-w-0 py-3 hover:no-underline">
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
                      <AccordionContent className="pl-7 text-xs text-muted-foreground">
                        {extracted && "raw_description" in extracted ? (
                          <p>Receipt text: {extracted.raw_description}</p>
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
            </div>
          )}

          {document.hash_matches_existing ? (
            <p className="flex items-center gap-2 text-xs text-amber-500">
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
          {mode === "line_items" ? (
            <span className="self-center text-xs text-muted-foreground sm:mr-auto">
              Selected total {money(selectedTotal, currency)}
            </span>
          ) : null}
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Review later
          </Button>
          <Button
            disabled={
              confirm.isPending ||
              (mode === "line_items" && selected.size === 0)
            }
            onClick={save}
          >
            {confirm.isPending ? "Saving…" : "Save to Payments"}
            {!confirm.isPending ? <Check data-icon="inline-end" /> : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
