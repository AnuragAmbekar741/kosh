import type { RefObject } from "react"

import { apiDetail } from "@/api/client"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import { useUpdateDocument } from "@/hooks/documents/use-documents"
import { useBillSavedToast } from "@/hooks/spend-items/use-bill-saved-toast"
import { useUpdateSpendItem } from "@/hooks/spend-items/use-spend-items"

import { fromIsoDate, toIsoDate } from "./spend-period"

type BillDatePopoverProps = {
  anchor: RefObject<HTMLElement | null>
  /** The bill's document; legacy ungrouped rows have none and use `itemId`. */
  documentId: string | null
  itemId?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  spentAt: string
  title: string
}

/** Calendar popover that moves a whole bill, and every line on it, to a new date. */
export function BillDatePopover({
  anchor,
  documentId,
  itemId,
  onOpenChange,
  open,
  spentAt,
  title,
}: BillDatePopoverProps) {
  const updateDocument = useUpdateDocument()
  const updateItem = useUpdateSpendItem()
  const billSaved = useBillSavedToast()
  const isPending = updateDocument.isPending || updateItem.isPending
  const error = updateDocument.error ?? updateItem.error
  // Older empty manual bills only have a `created_at` timestamp.
  const current = spentAt.slice(0, 10)
  const selected = fromIsoDate(current)

  function handleOpenChange(next: boolean) {
    if (isPending) return
    updateDocument.reset()
    updateItem.reset()
    onOpenChange(next)
  }

  async function save(date: Date | undefined) {
    if (!date) return
    const next = toIsoDate(date)
    if (next === current) {
      onOpenChange(false)
      return
    }
    try {
      if (documentId) {
        await updateDocument.mutateAsync({ documentId, spent_at: next })
      } else if (itemId) {
        await updateItem.mutateAsync({
          id: itemId,
          updates: { spent_at: next },
        })
      }
      billSaved(`Updated ${title}`, next)
      onOpenChange(false)
    } catch {
      // Mutation state renders the API error under the calendar.
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverContent align="end" anchor={anchor} className="w-auto">
        <PopoverHeader>
          <PopoverTitle>Bill date</PopoverTitle>
          <PopoverDescription>
            Every item on this bill moves with it.
          </PopoverDescription>
        </PopoverHeader>
        <Calendar
          autoFocus
          captionLayout="dropdown"
          defaultMonth={selected}
          disabled={isPending}
          mode="single"
          onSelect={(date) => void save(date)}
          selected={selected}
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {apiDetail(error) || "Date not changed. Please try again."}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
