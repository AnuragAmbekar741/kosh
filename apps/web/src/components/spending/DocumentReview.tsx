import { useState } from "react"
import { AlertCircleIcon, AlertTriangleIcon, CheckIcon } from "lucide-react"

import { apiDetail } from "@/api/client"
import type { DocumentDetail } from "@/api/documents/documents.types"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  onConfirmed: (spentAt?: string) => void
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

type EditingField = "name" | "amount"

type DocumentReviewLineRowProps = {
  amount: string
  category: string | null
  currency: string
  index: number
  name: string
  onUpdate: (updates: Partial<DraftEdit>) => void
  requiresReview: boolean
  spendItemId: string
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

function DocumentReviewLineRow({
  amount,
  category,
  currency,
  index,
  name,
  onUpdate,
  requiresReview,
  spendItemId,
}: DocumentReviewLineRowProps) {
  const [editingField, setEditingField] = useState<EditingField | null>(null)
  const [draftNameValue, setDraftNameValue] = useState(name)
  const [draftAmount, setDraftAmount] = useState(amount)
  const [fieldError, setFieldError] = useState("")
  const nameId = `draft-name-${spendItemId}`
  const amountId = `draft-amount-${spendItemId}`

  function beginNameEdit() {
    setDraftNameValue(name)
    setFieldError("")
    setEditingField("name")
  }

  function beginAmountEdit() {
    setDraftAmount(amount)
    setFieldError("")
    setEditingField("amount")
  }

  function cancelEditing() {
    setDraftNameValue(name)
    setDraftAmount(amount)
    setFieldError("")
    setEditingField(null)
  }

  function commitName() {
    const trimmed = draftNameValue.trim()
    if (!trimmed) {
      setFieldError("Enter an item name.")
      return
    }
    if (trimmed !== name) onUpdate({ name: trimmed })
    setFieldError("")
    setEditingField(null)
  }

  function commitAmount() {
    if (!Number.isFinite(Number(draftAmount)) || Number(draftAmount) <= 0) {
      setFieldError("Enter an amount greater than zero.")
      return
    }
    if (draftAmount !== amount) onUpdate({ amount: draftAmount })
    setFieldError("")
    setEditingField(null)
  }

  const categoryBadge = (
    <CategoryBadge
      category={category}
      onSelect={(nextCategory) => onUpdate({ category: nextCategory })}
    />
  )

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 not-first:border-t">
      <span className="w-5 text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0">
        {editingField === "name" ? (
          <Field className="gap-1" data-invalid={Boolean(fieldError)}>
            <FieldLabel className="sr-only" htmlFor={nameId}>
              Item name
            </FieldLabel>
            <div className="inline-flex w-full max-w-full flex-nowrap items-center gap-2">
              <Input
                aria-invalid={Boolean(fieldError)}
                autoFocus
                className="w-1/2 min-w-0 shrink-0"
                id={nameId}
                onBlur={commitName}
                onChange={(event) => {
                  setDraftNameValue(event.target.value)
                  setFieldError("")
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    event.preventDefault()
                    cancelEditing()
                  }
                }}
                value={draftNameValue}
              />
              {categoryBadge}
            </div>
            {fieldError ? (
              <FieldError className="text-xs">{fieldError}</FieldError>
            ) : null}
          </Field>
        ) : (
          <div className="inline-flex max-w-full flex-nowrap items-center gap-2">
            <button
              aria-label={`Edit ${name}. Double-click, or press Enter.`}
              className="max-w-full shrink cursor-text truncate rounded-sm text-left text-sm outline-none hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(event) => {
                if (event.detail === 0) beginNameEdit()
              }}
              onDoubleClick={beginNameEdit}
              onPointerUp={(event) => {
                if (event.pointerType === "touch") beginNameEdit()
              }}
              title="Double-click to edit"
              type="button"
            >
              {name}
            </button>
            {categoryBadge}
            {requiresReview ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      aria-label="Check this item"
                      className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
                      type="button"
                    />
                  }
                >
                  <AlertTriangleIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Check this item</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {editingField === "amount" ? (
          <Field className="gap-1" data-invalid={Boolean(fieldError)}>
            <FieldLabel className="sr-only" htmlFor={amountId}>
              Amount
            </FieldLabel>
            <Input
              aria-invalid={Boolean(fieldError)}
              autoFocus
              className="w-24 text-right"
              id={amountId}
              inputMode="decimal"
              min="0.01"
              onBlur={commitAmount}
              onChange={(event) => {
                setDraftAmount(event.target.value)
                setFieldError("")
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  cancelEditing()
                }
              }}
              step="0.01"
              type="number"
              value={draftAmount}
            />
            {fieldError ? (
              <FieldError className="text-xs">{fieldError}</FieldError>
            ) : null}
          </Field>
        ) : (
          <button
            aria-label={`Edit amount ${formatMoney(amount, currency)}. Double-click, or press Enter.`}
            className="cursor-text rounded-sm text-sm font-medium tabular-nums outline-none hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              if (event.detail === 0) beginAmountEdit()
            }}
            onDoubleClick={beginAmountEdit}
            onPointerUp={(event) => {
              if (event.pointerType === "touch") beginAmountEdit()
            }}
            title="Double-click to edit"
            type="button"
          >
            {formatMoney(amount, currency)}
          </button>
        )}
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
  onConfirmed: (spentAt?: string) => void
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
      const confirmed = await confirm.mutateAsync({ documentId: document.id })
      const spentAt =
        confirmed[0]?.spent_at ?? documentDate ?? lineDrafts[0]?.spent_at
      onConfirmed(spentAt ?? undefined)
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-lg font-medium">{merchant}</p>
              {document.hash_matches_existing ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        aria-label="Possible duplicate"
                        className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
                        type="button"
                      />
                    }
                  >
                    <AlertTriangleIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Possible duplicate. A matching document was uploaded before.
                    Confirm only if this is a separate expense.
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {documentDate ? formatDate(documentDate) : "Date not found"} ·{" "}
              {document.filename}
            </p>
          </div>
          <p className="shrink-0 text-xl font-medium tabular-nums">
            {formatMoney(total, extraction.currency)}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {lineDrafts.map((draft, index) => {
            const extracted =
              extraction.document_kind === "receipt"
                ? extraction.line_items[draft.line_index ?? -1]
                : extraction.transactions[draft.line_index ?? -1]

            return (
              <DocumentReviewLineRow
                amount={edits[draft.id].amount}
                category={edits[draft.id].category}
                currency={draft.currency}
                index={index}
                key={draft.id}
                name={edits[draft.id].name}
                onUpdate={(updates) => updateEdit(draft.id, updates)}
                requiresReview={Boolean(extracted?.requires_review)}
                spendItemId={draft.id}
              />
            )
          })}
        </div>

        {validationError ? <FieldError>{validationError}</FieldError> : null}

        {document.error ? (
          <Alert>
            <AlertTriangleIcon />
            <AlertTitle>Check the extracted totals</AlertTitle>
            <AlertDescription>
              The itemized amounts may not match the document total. Review the
              entries before adding them.
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

      <DialogFooter className="m-0 shrink-0 rounded-none bg-popover sm:justify-between">
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
