import { useState } from "react"
import {
  EllipsisVerticalIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { apiDetail } from "@/api/client"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteDocument } from "@/hooks/documents/use-documents"
import { useDeleteSpendItem } from "@/hooks/spend-items/use-spend-items"

import { formatDate, formatMoney } from "./spending-formatters"

type SpendingAccordionProps = {
  items: SpendItem[]
}

type SpendingGroup = {
  id: string
  items: SpendItem[]
}

type SpendingBillRowProps = {
  group: SpendingGroup
  onDelete: (group: SpendingGroup) => void
  onEdit: (group: SpendingGroup) => void
}

type SpendingLineRowProps = {
  item: SpendItem
  index: number
}

function sortLineItems(left: SpendItem, right: SpendItem) {
  const leftIndex = left.line_index ?? Number.MAX_SAFE_INTEGER
  const rightIndex = right.line_index ?? Number.MAX_SAFE_INTEGER
  if (leftIndex !== rightIndex) return leftIndex - rightIndex
  return left.spent_at.localeCompare(right.spent_at)
}

function groupSpendItems(items: SpendItem[]) {
  const groups = new Map<string, SpendingGroup>()

  for (const item of items) {
    const id = item.document_id ?? `manual-${item.id}`
    const group = groups.get(id)
    if (group) group.items.push(item)
    else groups.set(id, { id, items: [item] })
  }

  for (const group of groups.values()) {
    group.items.sort(sortLineItems)
  }

  return Array.from(groups.values()).sort((left, right) =>
    right.items[0].spent_at.localeCompare(left.items[0].spent_at)
  )
}

function SpendingLineRow({ item, index }: SpendingLineRowProps) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 pr-4 pl-16 not-first:border-t sm:pr-5 sm:pl-17">
      <span className="text-xs text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-normal">
          {item.description || item.merchant}
        </p>
        {item.category ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-sm font-normal tabular-nums">
        {formatMoney(item.amount, item.currency)}
      </p>
    </div>
  )
}

function SpendingBillRow({ group, onDelete, onEdit }: SpendingBillRowProps) {
  const first = group.items[0]
  const total = group.items.reduce((sum, item) => sum + Number(item.amount), 0)
  const itemLabel = group.items.length === 1 ? "item" : "items"

  return (
    <AccordionItem className="group/bill" value={group.id}>
      <AccordionTrigger
        actions={
          <span className="flex shrink-0 items-center gap-3">
            <span className="font-medium tabular-nums">
              {formatMoney(total, first.currency)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${first.merchant}`}
                render={
                  <Button
                    className="size-9 rounded-lg bg-accent hover:bg-accent"
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <EllipsisVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(group)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(group)}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        }
        className="cursor-pointer items-center rounded-none py-0 hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden"
        headerClassName="px-4 py-4 hover:bg-muted/50 group-data-open/bill:hover:bg-transparent sm:px-5 sm:py-5"
      >
        <span className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
            <FileTextIcon />
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium">{first.merchant}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Badge variant="outline">{formatDate(first.spent_at)}</Badge>
              <Badge variant="outline">
                {first.document_id ? "Document" : "Manual entry"}
              </Badge>
              <Badge variant="outline">
                {group.items.length} {itemLabel}
              </Badge>
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="h-auto border-t pb-0 [&_p]:mb-0 [&_p:not(:last-child)]:mb-0">
        {group.items.map((item, index) => (
          <SpendingLineRow index={index} item={item} key={item.id} />
        ))}
      </AccordionContent>
    </AccordionItem>
  )
}

export function SpendingAccordion({ items }: SpendingAccordionProps) {
  const groups = groupSpendItems(items)
  const [openBill, setOpenBill] = useState("")
  const [pendingDelete, setPendingDelete] = useState<SpendingGroup | null>(null)
  const deleteDocument = useDeleteDocument()
  const deleteSpendItem = useDeleteSpendItem()
  const isPending = deleteDocument.isPending || deleteSpendItem.isPending
  const error = deleteDocument.error ?? deleteSpendItem.error
  const pendingFirst = pendingDelete?.items[0]
  const pendingCount = pendingDelete?.items.length ?? 0
  const pendingItemLabel = pendingCount === 1 ? "item" : "items"

  function requestDelete(group: SpendingGroup) {
    deleteDocument.reset()
    deleteSpendItem.reset()
    setPendingDelete(group)
  }

  function openBillRow(group: SpendingGroup) {
    setOpenBill(group.id)
  }

  function closeDeleteDialog() {
    if (isPending) return
    setPendingDelete(null)
    deleteDocument.reset()
    deleteSpendItem.reset()
  }

  function confirmDelete() {
    if (!pendingFirst) return
    const request = pendingFirst.document_id
      ? deleteDocument.mutateAsync(pendingFirst.document_id)
      : deleteSpendItem.mutateAsync(pendingFirst.id)
    void request.then(() => {
      setPendingDelete(null)
    })
  }

  return (
    <>
      <Accordion
        className="overflow-hidden rounded-xl border"
        onValueChange={(next) => setOpenBill(next[0] ?? "")}
        value={openBill ? [openBill] : []}
      >
        {groups.map((group) => (
          <SpendingBillRow
            group={group}
            key={group.id}
            onDelete={requestDelete}
            onEdit={openBillRow}
          />
        ))}
      </Accordion>

      <Dialog
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
        open={pendingDelete !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this bill?</DialogTitle>
            <DialogDescription>
              {pendingFirst == null
                ? null
                : pendingFirst.document_id
                  ? `This removes ${pendingFirst.merchant} and its ${pendingCount} ${pendingItemLabel} from Spending, including the source file. This cannot be undone.`
                  : `This removes ${pendingFirst.merchant} from Spending. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Bill not deleted</AlertTitle>
              <AlertDescription>
                {apiDetail(error) || "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={closeDeleteDialog}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={confirmDelete}
              variant="destructive"
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
