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
import { Checkbox } from "@/components/ui/checkbox"
import { DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  useConfirmDocument,
  useDocument,
} from "@/hooks/documents/use-documents"

import { CategoryBadge } from "./CategoryBadge"
import { formatDate, formatMoney } from "./spending-formatters"

type ConfirmationMode = "total" | "line_items"

type DocumentReviewProps = {
  documentId: string
  onBack: () => void
  onConfirmed: () => void
  onTryAnother: () => void
}

function draftName(item: SpendItem) {
  return item.description || item.merchant
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
  const isStatement = extraction.document_kind === "statement"
  const lineDrafts = document.drafts.filter((item) => item.line_index !== null)
  const totalDraft = document.drafts.find((item) => item.line_index === null)
  const [mode, setMode] = useState<ConfirmationMode>(
    isStatement ? "line_items" : "total"
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(lineDrafts.map((item) => item.id))
  )
  const confirm = useConfirmDocument()

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

  if (document.drafts.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
        <CheckIcon className="text-muted-foreground" />
        <p className="font-medium">Already added to spending</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This document has no remaining items to review.
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

          {!isStatement && totalDraft ? (
            <ToggleGroup
              aria-label="How to add this receipt"
              className="grid w-full grid-cols-2"
              onValueChange={(value) => {
                const nextMode = value[0] as ConfirmationMode | undefined
                if (nextMode) setMode(nextMode)
              }}
              spacing={2}
              value={[mode]}
              variant="outline"
            >
              <ToggleGroupItem className="min-h-11" value="total">
                One total
              </ToggleGroupItem>
              <ToggleGroupItem className="min-h-11" value="line_items">
                Itemized
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}

          {mode === "total" && totalDraft ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {totalDraft.category
                ? `One ${totalDraft.category} entry will be added. The original document remains available as its source.`
                : "One spending entry will be added. The original document remains available as its source."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                  {selected.size} of {lineDrafts.length} items selected
                </p>
                <Button
                  onClick={() =>
                    setSelected(
                      selected.size === lineDrafts.length
                        ? new Set()
                        : new Set(lineDrafts.map((item) => item.id))
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  {selected.size === lineDrafts.length
                    ? "Clear all"
                    : "Select all"}
                </Button>
              </div>

              <Accordion className="border-y">
                {lineDrafts.map((draft) => {
                  const extracted =
                    extraction.document_kind === "receipt"
                      ? extraction.line_items[draft.line_index ?? -1]
                      : extraction.transactions[draft.line_index ?? -1]

                  return (
                    <AccordionItem key={draft.id} value={draft.id}>
                      <div className="flex min-h-12 items-center gap-3">
                        <Checkbox
                          aria-label={`Include ${draftName(draft)}`}
                          checked={selected.has(draft.id)}
                          className="after:-inset-3.5"
                          onCheckedChange={(checked) =>
                            toggleItem(draft.id, checked)
                          }
                        />
                        <AccordionTrigger className="min-w-0 py-3 hover:no-underline">
                          <span className="min-w-0 pr-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 truncate">
                                {draftName(draft)}
                              </span>
                              {draft.category ? (
                                <CategoryBadge category={draft.category} />
                              ) : null}
                            </span>
                            {extracted?.requires_review ? (
                              <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground [&_svg]:size-3.5">
                                <AlertTriangleIcon /> Check this item
                              </span>
                            ) : null}
                          </span>
                          <span className="mr-3 ml-auto shrink-0 tabular-nums">
                            {formatMoney(draft.amount, draft.currency)}
                          </span>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pl-7 text-xs text-muted-foreground">
                        {extracted && "raw_description" in extracted
                          ? `Receipt text: ${extracted.raw_description}`
                          : formatDate(draft.spent_at)}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          )}

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

          {confirm.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Couldn’t add these entries</AlertTitle>
              <AlertDescription>
                {apiDetail(confirm.error) || "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </ScrollArea>

      <DialogFooter className="m-0 rounded-none">
        {mode === "line_items" ? (
          <span className="self-center text-xs text-muted-foreground sm:mr-auto">
            Selected {formatMoney(selectedTotal, extraction.currency)}
          </span>
        ) : null}
        <Button onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button
          disabled={
            confirm.isPending || (mode === "line_items" && selected.size === 0)
          }
          onClick={save}
        >
          {confirm.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Add to spending
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
