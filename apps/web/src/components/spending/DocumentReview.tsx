import { useState } from "react"
import { AlertCircleIcon, AlertTriangleIcon, CheckIcon } from "lucide-react"

import { apiDetail } from "@/api/client"
import type { DocumentDetail } from "@/api/documents/documents.types"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import {
  useConfirmDocument,
  useDocument,
} from "@/hooks/documents/use-documents"
import { useUpdateSpendItem } from "@/hooks/spend-items/use-spend-items"

import { CategoryBadge } from "./CategoryBadge"
import { formatDate, formatMoney } from "./spending-formatters"

type DocumentReviewProps = {
  documentId: string
  onBack: () => void
  onConfirmed: () => void
  onTryAnother: () => void
}

function draftName(item: SpendItem) {
  return item.description || item.merchant
}

type DraftEdit = {
  name: string
  amount: string
  category: string | null
}

function ExtractionStatus({ filename }: { filename?: string }) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center"
      role="status"
    >
      <Spinner className="size-5" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Extracting document details</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {filename
            ? `${filename} is being read. This usually takes a moment.`
            : "Your document is being read. This usually takes a moment."}
        </p>
      </div>
    </div>
  )
}

function ReadyDocument({
  document,
  onBack,
  onConfirmed,
}: {
  document: DocumentDetail
  onBack: () => void
  onConfirmed: () => void
}) {
  const extraction = document.extraction!
  const lineDrafts = document.drafts.filter((item) => item.line_index !== null)
  const [edits, setEdits] = useState<Record<string, DraftEdit>>(() =>
    Object.fromEntries(
      lineDrafts.map((item) => [
        item.id,
        {
          name: draftName(item),
          amount: item.amount,
          category: item.category,
        },
      ])
    )
  )
  const [validationError, setValidationError] = useState("")
  const confirm = useConfirmDocument()
  const updateItem = useUpdateSpendItem()

  const merchant =
    extraction.document_kind === "receipt"
      ? extraction.merchant
      : extraction.institution || "Statement"
  const documentDate =
    extraction.document_kind === "receipt"
      ? extraction.purchased_at
      : extraction.period_end || extraction.period_start
  const total =
    extraction.document_kind === "receipt"
      ? extraction.total
      : lineDrafts.reduce((sum, item) => sum + Number(item.amount), 0)
  const reviewedTotal = lineDrafts.reduce(
    (sum, item) => sum + Number(edits[item.id]?.amount ?? item.amount),
    0
  )

  function updateEdit(id: string, updates: Partial<DraftEdit>) {
    setValidationError("")
    setEdits((current) => ({
      ...current,
      [id]: { ...current[id], ...updates },
    }))
  }

  async function save() {
    const invalid = lineDrafts.find((item) => {
      const edit = edits[item.id]
      return (
        !edit.name.trim() ||
        !Number.isFinite(Number(edit.amount)) ||
        Number(edit.amount) <= 0
      )
    })
    if (invalid) {
      setValidationError(
        "Every item needs a name and an amount greater than zero."
      )
      return
    }

    try {
      await Promise.all(
        lineDrafts.flatMap((item) => {
          const edit = edits[item.id]
          const updates = {
            description: edit.name.trim(),
            amount: edit.amount,
            category: edit.category,
          }
          const unchanged =
            updates.description === draftName(item) &&
            updates.amount === item.amount &&
            updates.category === item.category
          return unchanged
            ? []
            : [updateItem.mutateAsync({ id: item.id, updates })]
        })
      )
      await confirm.mutateAsync({ documentId: document.id })
      onConfirmed()
    } catch {
      // Mutation state renders the API error below the review.
    }
  }

  if (lineDrafts.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
        <AlertCircleIcon className="text-muted-foreground" />
        <p className="font-medium">No spend items found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This document has no extracted items available to review.
        </p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="max-h-[min(65svh,42rem)]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium">{merchant}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {documentDate ? formatDate(documentDate) : "Date not found"} ·{" "}
                {document.filename}
              </p>
            </div>
            <p className="shrink-0 text-2xl font-medium tabular-nums">
              {formatMoney(total, extraction.currency)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">
                Review {lineDrafts.length}{" "}
                {lineDrafts.length === 1 ? "item" : "items"}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatMoney(reviewedTotal, extraction.currency)}
              </p>
            </div>

            <Accordion className="border-y">
              {lineDrafts.map((draft) => {
                const extracted =
                  extraction.document_kind === "receipt"
                    ? extraction.line_items[draft.line_index ?? -1]
                    : extraction.transactions[draft.line_index ?? -1]

                return (
                  <AccordionItem key={draft.id} value={draft.id}>
                    <div className="flex min-h-12 items-center">
                      <AccordionTrigger className="min-w-0 py-3 hover:no-underline">
                        <span className="min-w-0 pr-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 truncate">
                              {edits[draft.id].name}
                            </span>
                            {edits[draft.id].category ? (
                              <CategoryBadge
                                category={edits[draft.id].category}
                              />
                            ) : null}
                          </span>
                          {extracted?.requires_review ? (
                            <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground [&_svg]:size-3.5">
                              <AlertTriangleIcon /> Check this item
                            </span>
                          ) : null}
                        </span>
                        <span className="mr-3 ml-auto shrink-0 tabular-nums">
                          {formatMoney(edits[draft.id].amount, draft.currency)}
                        </span>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="space-y-3 pb-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
                        <Field>
                          <FieldLabel htmlFor={`draft-name-${draft.id}`}>
                            Item
                          </FieldLabel>
                          <Input
                            id={`draft-name-${draft.id}`}
                            onChange={(event) =>
                              updateEdit(draft.id, { name: event.target.value })
                            }
                            value={edits[draft.id].name}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`draft-amount-${draft.id}`}>
                            Amount
                          </FieldLabel>
                          <Input
                            id={`draft-amount-${draft.id}`}
                            inputMode="decimal"
                            min="0.01"
                            onChange={(event) =>
                              updateEdit(draft.id, {
                                amount: event.target.value,
                              })
                            }
                            step="0.01"
                            type="number"
                            value={edits[draft.id].amount}
                          />
                        </Field>
                        <CategoryBadge
                          category={edits[draft.id].category}
                          onSelect={(category) =>
                            updateEdit(draft.id, { category })
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {extracted && "raw_description" in extracted
                          ? `Receipt text: ${extracted.raw_description}`
                          : formatDate(draft.spent_at)}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          {validationError ? <FieldError>{validationError}</FieldError> : null}

          {document.hash_matches_existing ? (
            <Alert>
              <AlertTriangleIcon />
              <AlertTitle>Possible duplicate</AlertTitle>
              <AlertDescription>
                A matching document was uploaded before. Confirm only if this is
                a separate expense.
              </AlertDescription>
            </Alert>
          ) : null}

          {document.error ? (
            <Alert>
              <AlertTriangleIcon />
              <AlertTitle>Check the extracted totals</AlertTitle>
              <AlertDescription>
                The itemized amounts may not match the document total. Review
                the entries before adding them.
              </AlertDescription>
            </Alert>
          ) : null}

          {confirm.isError || updateItem.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Couldn’t add these entries</AlertTitle>
              <AlertDescription>
                {apiDetail(updateItem.error) ||
                  apiDetail(confirm.error) ||
                  "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </ScrollArea>

      <DialogFooter className="m-0 rounded-none">
        <Button onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button
          disabled={
            confirm.isPending || updateItem.isPending || lineDrafts.length === 0
          }
          onClick={() => void save()}
        >
          {confirm.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Add all to spending
        </Button>
      </DialogFooter>
    </>
  )
}

export function DocumentReview({
  documentId,
  onBack,
  onConfirmed,
  onTryAnother,
}: DocumentReviewProps) {
  const document = useDocument(documentId)

  if (
    document.isPending ||
    document.data?.status === "uploaded" ||
    document.data?.status === "processing"
  ) {
    return <ExtractionStatus filename={document.data?.filename} />
  }

  if (document.isError || document.data?.status === "failed") {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircleIcon className="text-destructive" />
        <div className="flex max-w-sm flex-col gap-1">
          <p className="font-medium">We couldn’t read this document</p>
          <p className="text-sm text-muted-foreground">
            {document.data?.error ||
              apiDetail(document.error) ||
              "Try a clearer image or a different file."}
          </p>
        </div>
        <Button onClick={onTryAnother} variant="outline">
          Try another document
        </Button>
      </div>
    )
  }

  if (!document.data?.extraction) {
    return (
      <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        No extracted details are available for this document.
      </div>
    )
  }

  return (
    <ReadyDocument
      document={document.data}
      key={document.data.id}
      onBack={onBack}
      onConfirmed={onConfirmed}
    />
  )
}
