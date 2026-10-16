import { useRef, useState, type FormEvent } from "react"
import { CheckIcon, Trash2Icon } from "lucide-react"

import { apiDetail } from "@/api/client"
import type {
  Category,
  SpendItem,
  SpendItemUpdate,
} from "@/api/spend-items/spend-items.types"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAddDocumentLineItem } from "@/hooks/documents/use-documents"
import { useUpdateSpendItem } from "@/hooks/spend-items/use-spend-items"
import { cn } from "@/lib/utils"

import { CATEGORIES, categorySwatchClass } from "./categories"
import { ItemPicker } from "./ItemPicker"
import { formatMoney } from "./spending-formatters"

export type LineItemSheetTarget =
  | { kind: "add"; documentId: string; billTitle: string; currency: string }
  | { kind: "edit"; item: SpendItem }

type LineItemSheetProps = {
  target: LineItemSheetTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit only: hand the line to the bill's delete confirmation. */
  onDelete?: (item: SpendItem) => void
}

type Draft = {
  name: string
  amount: string
  category: Category | null
}

function itemName(item: SpendItem) {
  return item.description || item.merchant
}

function draftFor(target: LineItemSheetTarget): Draft {
  if (target.kind === "add") return { name: "", amount: "", category: null }
  return {
    name: itemName(target.item),
    amount: Number(target.item.amount).toFixed(2),
    category: target.item.category,
  }
}

function currencySymbol(currency: string) {
  return (
    new Intl.NumberFormat(undefined, { style: "currency", currency })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  )
}

/** The checks the inline desktop rows make, in the same order. */
const NAME_ERROR = "Enter an item name."
const AMOUNT_ERROR = "Enter a price greater than zero."

function validate(draft: Draft) {
  const amount = Number(draft.amount)
  if (!draft.name.trim()) return NAME_ERROR
  if (!Number.isFinite(amount) || amount <= 0) return AMOUNT_ERROR
  if (!draft.category) return "Choose a category."
  return ""
}

/** Only the fields that changed; the name goes where the row reads it from. */
function changes(item: SpendItem, draft: Draft): SpendItemUpdate {
  const updates: SpendItemUpdate = {}
  const name = draft.name.trim()
  if (name !== itemName(item)) {
    if (item.document_id || item.description) updates.description = name
    else updates.merchant = name
  }
  const amount = Number(draft.amount).toFixed(2)
  if (amount !== Number(item.amount).toFixed(2)) updates.amount = amount
  if (draft.category && draft.category !== item.category) {
    updates.category = draft.category
  }
  return updates
}

type CategoryChipsProps = {
  value: Category | null
  disabled: boolean
  onChange: (category: Category) => void
}

function CategoryChips({ value, disabled, onChange }: CategoryChipsProps) {
  return (
    <ToggleGroup
      aria-label="Category"
      className="w-full flex-wrap"
      disabled={disabled}
      onValueChange={(next: string[]) => {
        const category = CATEGORIES.find((option) => option === next[0])
        if (category) onChange(category)
      }}
      size="dense"
      value={value ? [value] : []}
      variant="outline"
    >
      {CATEGORIES.map((category) => (
        <ToggleGroupItem key={category} value={category}>
          <span
            aria-hidden
            className={cn("size-2 rounded-full", categorySwatchClass(category))}
          />
          {category}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * Phones: add or edit one bill line in a bottom sheet. Full-width name and
 * price, categories as one-tap chips, and the actions in thumb reach. Adding
 * keeps the sheet open for the next line until Done.
 */
export function LineItemSheet({
  target,
  open,
  onOpenChange,
  onDelete,
}: LineItemSheetProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFor(target))
  const [validationError, setValidationError] = useState("")
  const [lastAdded, setLastAdded] = useState("")
  const [wasOpen, setWasOpen] = useState(open)
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const addLine = useAddDocumentLineItem()
  const updateItem = useUpdateSpendItem()
  const isAdd = target.kind === "add"
  const mutation = isAdd ? addLine : updateItem
  const pending = mutation.isPending
  const error = validationError || apiDetail(mutation.error)
  // Only the field a validation message is about turns red.
  const nameInvalid = validationError === NAME_ERROR
  const amountInvalid = validationError === AMOUNT_ERROR
  const currency = isAdd ? target.currency : target.item.currency
  const idPrefix = isAdd
    ? `line-add-${target.documentId}`
    : `line-edit-${target.item.id}`

  function edit(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setValidationError("")
    mutation.reset()
  }

  function setOpen(next: boolean) {
    if (!next) {
      addLine.reset()
      updateItem.reset()
    }
    onOpenChange(next)
  }

  // Every open starts from the line as saved (or blank for a new one).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(draftFor(target))
      setValidationError("")
      setLastAdded("")
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = validate(draft)
    setValidationError(problem)
    if (problem) return
    const amount = Number(draft.amount).toFixed(2)
    try {
      if (target.kind === "add" && draft.category) {
        await addLine.mutateAsync({
          documentId: target.documentId,
          description: draft.name.trim(),
          amount,
          category: draft.category,
        })
        // Ready for the next line on the same receipt.
        setLastAdded(`${draft.name.trim()} · ${formatMoney(amount, currency)}`)
        // Lines on one receipt usually share a category: keep it.
        setDraft((current) => ({
          ...draftFor(target),
          category: current.category,
        }))
        // After the fields re-enable from the save.
        requestAnimationFrame(() => nameRef.current?.focus())
        return
      }
      if (target.kind === "edit") {
        const updates = changes(target.item, draft)
        if (Object.keys(updates).length) {
          await updateItem.mutateAsync({ id: target.item.id, updates })
        }
        setOpen(false)
      }
    } catch {
      // Mutation state renders the API error above the actions.
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetContent
        className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        // Edit lands on the form, not a field, so the keyboard stays down until
        // a field is tapped. Add goes straight to Name.
        initialFocus={isAdd ? true : formRef}
        side="bottom"
      >
        <form
          className="flex flex-col outline-none"
          noValidate
          onSubmit={submit}
          ref={formRef}
          tabIndex={-1}
        >
          <SheetHeader>
            <SheetTitle>{isAdd ? "Add item" : "Edit item"}</SheetTitle>
            <SheetDescription>
              {isAdd
                ? `A line on ${target.billTitle}.`
                : `On ${target.item.merchant}.`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-2">
            <Field className="gap-1.5" data-invalid={nameInvalid}>
              <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
              <Input
                aria-invalid={nameInvalid}
                autoComplete="off"
                autoFocus={isAdd}
                disabled={pending}
                enterKeyHint="next"
                id={`${idPrefix}-name`}
                onChange={(event) => edit({ name: event.target.value })}
                placeholder="As it reads on the bill"
                ref={nameRef}
                value={draft.name}
              />
            </Field>
            <Field className="gap-1.5" data-invalid={amountInvalid}>
              <FieldLabel htmlFor={`${idPrefix}-amount`}>Price</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{currencySymbol(currency)}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={amountInvalid}
                  className="tabular-nums"
                  disabled={pending}
                  enterKeyHint="done"
                  id={`${idPrefix}-amount`}
                  inputMode="decimal"
                  onChange={(event) => edit({ amount: event.target.value })}
                  placeholder="0.00"
                  value={draft.amount}
                />
              </InputGroup>
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Category</span>
              <CategoryChips
                disabled={pending}
                onChange={(category) => edit({ category })}
                value={draft.category}
              />
            </div>
            {target.kind === "edit" && target.item.item_status !== "none" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Product</span>
                <ItemPicker line={target.item} />
              </div>
            ) : null}
          </div>
          {/* Pinned, so the actions stay in reach while the form scrolls. */}
          <SheetFooter className="sticky bottom-0 gap-2 border-t bg-popover">
            {/* Here, not by the fields, so it shows however far the form scrolled. */}
            <div aria-live="polite" className="empty:-mb-2">
              {error ? (
                <FieldError>{error}</FieldError>
              ) : isAdd && lastAdded ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckIcon aria-hidden className="size-4 text-foreground" />
                  <span className="truncate">Added {lastAdded}</span>
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {target.kind === "edit" && onDelete ? (
                <Button
                  className="mr-auto"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false)
                    onDelete(target.item)
                  }}
                  type="button"
                  variant="destructive"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              ) : (
                <Button
                  className="mr-auto"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Done
                </Button>
              )}
              <Button disabled={pending} type="submit">
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {isAdd ? "Add item" : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
