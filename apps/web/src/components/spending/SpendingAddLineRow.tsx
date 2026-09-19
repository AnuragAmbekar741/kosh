import { useState } from "react"

import { apiDetail } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAddDocumentLineItem } from "@/hooks/documents/use-documents"
import { cn } from "@/lib/utils"

import { CategoryBadge } from "./CategoryBadge"

type SpendingAddLineRowProps = {
  documentId: string
  index: number
  startOpen?: boolean
}

export function SpendingAddLineRow({
  documentId,
  index,
  startOpen = false,
}: SpendingAddLineRowProps) {
  const [isOpen, setIsOpen] = useState(startOpen)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [validationError, setValidationError] = useState("")
  const addLine = useAddDocumentLineItem()
  const error = validationError || apiDetail(addLine.error)
  const nameId = `spend-add-name-${documentId}`
  const amountId = `spend-add-amount-${documentId}`

  function resetForm() {
    setName("")
    setAmount("")
    setCategory(null)
    setValidationError("")
    addLine.reset()
  }

  function cancel() {
    resetForm()
    setIsOpen(false)
  }

  async function save() {
    const trimmedName = name.trim()
    const parsedAmount = Number(amount)
    if (!trimmedName) {
      setValidationError("Enter an item name.")
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError("Enter a price greater than zero.")
      return
    }
    setValidationError("")
    try {
      await addLine.mutateAsync({
        documentId,
        description: trimmedName,
        amount: parsedAmount.toFixed(2),
        category,
      })
      resetForm()
      setIsOpen(false)
    } catch {
      // Mutation state renders the API error beside the row.
    }
  }

  if (!isOpen) {
    return (
      <button
        className="grid w-full cursor-pointer items-center gap-3 py-3 pr-4 pl-16 text-left not-first:border-t hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:pr-5 sm:pl-17"
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
        type="button"
      >
        <span className="text-xs text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-sm text-muted-foreground">Add item</span>
      </button>
    )
  }

  return (
    <div className="grid items-center gap-3 py-3 pr-4 pl-16 not-first:border-t grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:pr-5 sm:pl-17">
      <span className="text-xs text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <Field className="min-w-0 gap-1" data-invalid={Boolean(error)}>
        <FieldLabel className="sr-only" htmlFor={nameId}>
          Item name
        </FieldLabel>
        <div className="inline-flex w-full max-w-full flex-nowrap items-center gap-2">
          <Input
            aria-invalid={Boolean(error)}
            autoFocus
            className="w-1/2 min-w-0 shrink-0"
            disabled={addLine.isPending}
            id={nameId}
            onChange={(event) => {
              setName(event.target.value)
              setValidationError("")
              addLine.reset()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void save()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                cancel()
              }
            }}
            placeholder="Item"
            value={name}
          />
          <CategoryBadge
            category={category}
            disabled={addLine.isPending}
            onSelect={(next) => {
              setCategory(next)
              addLine.reset()
            }}
          />
        </div>
        {error ? <FieldError className="text-xs">{error}</FieldError> : null}
      </Field>
      <div className="col-start-2 flex shrink-0 items-center gap-2 justify-self-end sm:col-start-3 sm:row-start-1">
        <Field className="gap-0">
          <FieldLabel className="sr-only" htmlFor={amountId}>
            Price
          </FieldLabel>
          <Input
            aria-invalid={Boolean(error)}
            className="w-24 text-right tabular-nums"
            disabled={addLine.isPending}
            id={amountId}
            inputMode="decimal"
            onChange={(event) => {
              setAmount(event.target.value)
              setValidationError("")
              addLine.reset()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void save()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                cancel()
              }
            }}
            placeholder="0.00"
            value={amount}
          />
        </Field>
        <Button
          className={cn(addLine.isPending && "pointer-events-none")}
          disabled={addLine.isPending}
          onClick={() => void save()}
          size="sm"
          type="button"
        >
          {addLine.isPending ? <Spinner data-icon="inline-start" /> : null}
          Add
        </Button>
      </div>
    </div>
  )
}
