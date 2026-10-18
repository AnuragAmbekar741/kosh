import { type RefObject, useRef, useState } from "react"
import { CheckIcon, Trash2Icon } from "lucide-react"

import { apiDetail } from "@/api/client"
import type {
  Category,
  SpendItem,
  SpendItemUpdate,
} from "@/api/spend-items/spend-items.types"
import {
  CATEGORIES,
  categorySwatchClass,
  categoryTintClass,
} from "@/components/spending/categories"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useAddDocumentLineItem } from "@/hooks/documents/use-documents"
import { useUpdateSpendItem } from "@/hooks/spend-items/use-spend-items"
import { cn } from "@/lib/utils"

import { ItemPicker } from "./ItemPicker"

export type LineSheetTarget =
  | { kind: "edit"; item: SpendItem }
  | { kind: "add"; billTitle: string; currency: string; documentId: string }

type SpendingLineSheetProps = {
  onClose: () => void
  onDelete: (item: SpendItem) => void
  target: LineSheetTarget | null
}

/**
 * Phones edit and add bill lines here instead of inline: full-width fields,
 * a decimal keypad for the amount, and every category one tap away.
 */
export function SpendingLineSheet({
  onClose,
  onDelete,
  target,
}: SpendingLineSheetProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open={target !== null}
    >
      <SheetContent
        className="max-h-[92dvh] gap-0 rounded-t-2xl"
        // Editing opens without the keyboard so every field stays in view;
        // adding goes straight to the name.
        initialFocus={target?.kind === "edit" ? formRef : true}
        side="bottom"
      >
        {target ? (
          <LineSheetForm
            formRef={formRef}
            key={target.kind === "edit" ? target.item.id : target.documentId}
            onClose={onClose}
            onDelete={onDelete}
            target={target}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function itemName(item: SpendItem) {
  return item.description || item.merchant
}

type Invalid = {
  field: "name" | "amount" | "category"
  message: string
}

type LineSheetFormProps = {
  formRef: RefObject<HTMLFormElement | null>
  onClose: () => void
  onDelete: (item: SpendItem) => void
  target: LineSheetTarget
}

function LineSheetForm({
  formRef,
  onClose,
  onDelete,
  target,
}: LineSheetFormProps) {
  const item = target.kind === "edit" ? target.item : null
  const amountRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(item ? itemName(item) : "")
  const [amount, setAmount] = useState(
    item ? Number(item.amount).toFixed(2) : ""
  )
  const [category, setCategory] = useState<Category | null>(
    item?.category ?? null
  )
  const [invalid, setInvalid] = useState<Invalid | null>(null)
  const updateItem = useUpdateSpendItem()
  const addLine = useAddDocumentLineItem()
  const isPending = updateItem.isPending || addLine.isPending
  const error =
    invalid?.message || apiDetail(updateItem.error) || apiDetail(addLine.error)
  const currency =
    target.kind === "edit" ? target.item.currency : target.currency
  const idPrefix = `line-sheet-${item?.id ?? "new"}`
  const errorId = `${idPrefix}-error`

  function clearErrors() {
    setInvalid(null)
    updateItem.reset()
    addLine.reset()
  }

  async function save() {
    const trimmedName = name.trim()
    const parsedAmount = Number(amount.replace(",", "."))
    if (!trimmedName) {
      setInvalid({ field: "name", message: "Enter an item name." })
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setInvalid({
        field: "amount",
        message: "Enter an amount greater than zero.",
      })
      return
    }
    if (!category) {
      setInvalid({ field: "category", message: "Choose a category." })
      return
    }
    clearErrors()
    const fixedAmount = parsedAmount.toFixed(2)

    try {
      if (target.kind === "add") {
        await addLine.mutateAsync({
          documentId: target.documentId,
          description: trimmedName,
          amount: fixedAmount,
          category,
        })
      } else {
        const original = target.item
        const updates: SpendItemUpdate = {}
        if (trimmedName !== itemName(original)) {
          // Bill lines keep their text in description; a lone manual entry
          // may only have a merchant.
          if (original.document_id || original.description) {
            updates.description = trimmedName
          } else {
            updates.merchant = trimmedName
          }
        }
        if (fixedAmount !== Number(original.amount).toFixed(2)) {
          updates.amount = fixedAmount
        }
        if (category !== original.category) updates.category = category
        if (Object.keys(updates).length) {
          await updateItem.mutateAsync({ id: original.id, updates })
        }
      }
      onClose()
    } catch {
      // Mutation state renders the API error above the buttons.
    }
  }

  return (
    <form
      className="flex min-h-0 flex-col outline-none"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      ref={formRef}
      tabIndex={-1}
    >
      <SheetHeader className="pr-14 pb-2">
        <SheetTitle>{item ? "Edit item" : "Add item"}</SheetTitle>
        <SheetDescription className="truncate">
          {target.kind === "edit" ? target.item.merchant : target.billTitle}
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
          <Input
            aria-describedby={errorId}
            aria-invalid={invalid?.field === "name"}
            autoComplete="off"
            disabled={isPending}
            enterKeyHint="next"
            id={`${idPrefix}-name`}
            onChange={(event) => {
              setName(event.target.value)
              clearErrors()
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              amountRef.current?.focus()
            }}
            placeholder="As printed on the bill"
            value={name}
          />
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${idPrefix}-amount`}>
            Amount
            {currency ? (
              <span className="font-normal text-muted-foreground">
                {currency}
              </span>
            ) : null}
          </FieldLabel>
          <Input
            aria-describedby={errorId}
            aria-invalid={invalid?.field === "amount"}
            autoComplete="off"
            className="tabular-nums"
            disabled={isPending}
            enterKeyHint="done"
            id={`${idPrefix}-amount`}
            inputMode="decimal"
            onChange={(event) => {
              setAmount(event.target.value)
              clearErrors()
            }}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="0.00"
            ref={amountRef}
            value={amount}
          />
        </Field>

        <fieldset className="flex flex-col gap-2" disabled={isPending}>
          <legend className="mb-2 text-sm font-medium">Category</legend>
          <div
            aria-describedby={errorId}
            aria-invalid={invalid?.field === "category"}
            aria-label="Category"
            className="flex flex-wrap gap-2"
            role="radiogroup"
          >
            {CATEGORIES.map((option) => {
              const selected = category === option
              return (
                <button
                  aria-checked={selected}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-80 disabled:opacity-50",
                    selected
                      ? cn(
                          "border-transparent font-medium",
                          categoryTintClass(option)
                        )
                      : "bg-background hover:bg-muted"
                  )}
                  key={option}
                  onClick={() => {
                    setCategory(option)
                    clearErrors()
                  }}
                  role="radio"
                  type="button"
                >
                  {selected ? (
                    <CheckIcon aria-hidden="true" className="size-3.5" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2.5 rounded-full",
                        categorySwatchClass(option)
                      )}
                    />
                  )}
                  {option}
                </button>
              )
            })}
          </div>
        </fieldset>

        {item && item.item_status !== "none" ? (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">Product</span>
            <ItemPicker line={item} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t bg-popover px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Always present, so a message coming or going doesn't move the
            fields under the thumb. */}
        <p
          aria-live="polite"
          className="min-h-5 text-sm text-destructive"
          id={errorId}
        >
          {error}
        </p>
        <div className="flex items-center gap-2">
          {item ? (
            <Button
              aria-label={`Delete ${itemName(item)}`}
              className="size-11"
              disabled={isPending}
              onClick={() => onDelete(item)}
              type="button"
              variant="outline"
            >
              <Trash2Icon className="text-destructive" />
            </Button>
          ) : null}
          <Button className="h-11 flex-1" disabled={isPending} type="submit">
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {item ? "Save" : "Add item"}
          </Button>
        </div>
      </div>
    </form>
  )
}
